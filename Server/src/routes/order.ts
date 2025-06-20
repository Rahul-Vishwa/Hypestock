import { Router, Request, Response } from "express";
import { z } from "zod";
import { prismaClient } from "../db/db";
import { io } from "../socket/websocket";

const router = Router();

interface Order {
    orderId: string;
    price: number;
    quantity: number;
    userId: string;
}

const OrderSchema = z.object({
    eventId: z.string(),
    price: z.number(),
    quantity: z.number(),
    side: z.enum(['bid', 'ask'])
});

// TODO: update balances from bids and asks once the event ends
// TODO: Balance not correct after trading
// TODO: Lock balance
// The event is added in map in cron job
export const bids: Map<string, Order[]> = new Map();
export const asks: Map<string, Order[]> = new Map();

export const price: Map<string, { value: number, time: number }[]> = new Map();

async function createOrder(eventId: string, userId: string, price: number, quantity: number, remainingQty: number, side: 'bid' | 'ask') {
    try {
        const order = await prismaClient.order.create({
            data: {
                eventId,
                createdBy: userId,
                price,
                quantity,
                remainingQty,
                side
            }
        });
        return order.id;
    }
    catch (error) {
        console.error('trade.ts createOrder');
        console.error(error);
        return null;
    }
}



router.post('/', async (req: Request, res: Response) => {
    const { eventId, price, quantity, side } = OrderSchema.parse(req.body);
    const userId = req.auth?.payload.sub;

    const user = await prismaClient.user.findUnique({
        where: {
            id: userId
        }
    });

    if (!user || !userId) {
        res.status(401).json({ message: 'User not found' });
        return;
    }

    if (user.balance < price * quantity) {
        res.status(500).json({ message: 'Enough balance not available' });
        return;
    }

    const remainingQty = await fillOrder(eventId, userId, price , quantity, side);
    const orderId = await createOrder(eventId, userId, price, quantity, remainingQty, side);

    if (remainingQty === 0){
        res.json({ quantity: 0 });
        return;
    }

    if (side === 'bid') {
        const eventBids = bids.get(eventId) || [];
        
        eventBids.push({
            orderId: orderId!,
            price,
            quantity: remainingQty,
            userId
        });
        eventBids.sort((a, b) => a.price - b.price);
        bids.set(eventId, eventBids);
        sendOrderBook(eventId);
    }
    else {
        const eventAsks = asks.get(eventId) || [];

        eventAsks.push({
            orderId: orderId!,
            price,
            quantity: remainingQty,
            userId
        });
        eventAsks.sort((a, b) => b.price - a.price);
        asks.set(eventId, eventAsks);
        sendOrderBook(eventId);
    }

    res.json({ message: 'Order placed successfully', quantity: quantity - remainingQty });
}); 

async function fillOrder(eventId: string, userId: string, price: number, quantity: number, side: 'bid' | 'ask'): Promise<number> {
    try {
        let remainingQty = quantity;
        
        if (side === 'bid') {
            const eventAsks = asks.get(eventId) || [];

            for (let i = eventAsks.length - 1; i >= 0; i--) {
                if (eventAsks[i].price > price) {
                    break;
                }

                if (eventAsks[i].quantity > remainingQty) {
                    eventAsks[i].quantity -= remainingQty;
                    updateInfo(eventId, eventAsks[i], userId, price, remainingQty, side);
                    return 0;
                }
                else {
                    remainingQty -= eventAsks[i].quantity;
                    updateInfo(eventId, eventAsks[i], userId, price, eventAsks[i].quantity, side);
                    eventAsks.splice(i, 1);
                }
            }
        }
        else {
            const eventBids = bids.get(eventId) || [];

            for (let i = eventBids.length - 1; i >= 0; i--) {
                if (eventBids[i].price < price) {
                    break;
                }

                if (eventBids[i].quantity > remainingQty) {
                    eventBids[i].quantity -= remainingQty;
                    updateInfo(eventId, eventBids[i], userId, price, remainingQty, side);
                    return 0;
                }
                else {
                    remainingQty -= eventBids[i].quantity;
                    updateInfo(eventId, eventBids[i], userId, price, eventBids[i].quantity, side);
                    eventBids.splice(i, 1);
                }
            }
        }

        return remainingQty;
    }
    catch (error) {
        console.error('trade.ts fillOrder');
        console.error(error);
        return 0;
    }
}

async function updateInfo(eventId: string, order: Order, userId: string, price: number, quantity: number, side: 'ask' | 'bid') {
    await updateBalance(order, userId, price, quantity, side);
    updatePrice(eventId, price);
    sendOrderBook(eventId);
}

async function updateBalance(matchedOrder: Order, userId: string, price: number, quantity: number, side: 'bid' | 'ask') {
    try {
        const bidPrice = side === 'bid' ? price : matchedOrder.price; 
        const askPrice = side === 'ask' ? price : matchedOrder.price; 

        const buyerBalance = bidPrice * quantity;
        const sellerBalance = askPrice * quantity;

        // You can take the difference between the prices
        const platformFee = buyerBalance - sellerBalance;
        
        await prismaClient.$transaction([
            prismaClient.user.update({
                where: { 
                    id: userId 
                },
                data: {
                    balance: {
                        decrement: buyerBalance
                    }
                }
            }),
            prismaClient.user.update({
                where: {
                    id: matchedOrder.userId
                },
                data: {
                    balance: {
                        increment: sellerBalance
                    }
                }
            }),
            prismaClient.order.update({
                where: { 
                    id: matchedOrder.orderId
                },
                data: {
                    remainingQty: {
                        decrement: quantity
                    }
                }
            })
        ]);
    }
    catch (error) {
        console.error('trade.ts updateBalance');
        console.error(error);
    }
}

function updatePrice(eventId: string, priceNow: number) {
    const prices = price.get(eventId) || [];

    const currentPrice = { value: priceNow, time: Date.now() }; 

    prices.push(currentPrice);
    price.set(eventId, prices);
    
    io.emit('priceChanged', currentPrice);
}

interface OrderBook {
    [price: number]: {
        side: 'bid' | 'ask',
        quantity: number
    }
}

function getOrderBook(eventId: string): OrderBook{
    const eventBids = bids.get(eventId) || [];
    const eventAsks = asks.get(eventId) || [];
    
    const order: OrderBook = {};

    for (let i = 0; i < eventBids.length; i++) {
        if (!order[eventBids[i].price]){
            order[eventBids[i].price] = {
                side: 'bid',
                quantity: eventBids[i].quantity
            };
        }
        else {
            order[eventBids[i].price].quantity += eventBids[i].quantity;
        }
    }
    
    for (let i = 0; i < eventAsks.length; i++) {
        if (!order[eventAsks[i].price]){
            order[eventAsks[i].price] = {
                side: 'ask',
                quantity: eventAsks[i].quantity
            };
        }
        else {
            order[eventAsks[i].price].quantity += eventAsks[i].quantity;
        }
    }

    return order;
}

export function sendOrderBook(eventId: string) {
    const orderBook = getOrderBook(eventId);
    io.emit('orderBook', orderBook);
}

router.get('/prices', (req: Request, res: Response) => {
    const { eventId } = req.query;

    if (eventId?.toString()){
        const prices = price.get(eventId?.toString()) || [];
        res.json({ prices });
        return;
    }

    res.status(500).json({ message: 'Wrong event id' });
})

export const orderRouter = router;