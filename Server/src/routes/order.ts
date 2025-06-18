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

async function updateBalance(data: Order, eventId: string, userId: string, price: number, quantity: number, side: 'bid' | 'ask') {
    try {
        const thisUserBalance = (price * quantity);
        const otherUserBalance = (data.price * quantity);
        
        // You can take the difference between the prices
        await prismaClient.$transaction([
            prismaClient.user.update({
                where: { 
                    id: userId 
                },
                data: {
                    balance: {
                        increment: side === 'ask' ? thisUserBalance : (-1 * thisUserBalance)
                    }
                }
            }),
            prismaClient.user.update({
                where: {
                    id: data.userId
                },
                data: {
                    balance: {
                        increment: side === 'bid' ? otherUserBalance : (-1 * otherUserBalance) 
                    }
                }
            }),
            prismaClient.order.update({
                where: { 
                    id: data.orderId
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

    const remainingQty = fillOrder(eventId, userId, price , quantity, side);
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

    res.json({ quantity: quantity - remainingQty });
}); 

function fillOrder(eventId: string, userId: string, price: number, quantity: number, side: 'bid' | 'ask'): number {
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
                    updateBalance(eventAsks[i], eventId, userId, price, remainingQty, side);
                    sendOrderBook(eventId);
                    updatePrice(eventId, price);
                    return 0;
                }
                else {
                    remainingQty -= eventAsks[i].quantity;
                    updateBalance(eventAsks[i], eventId, userId, price, eventAsks[i].quantity, side);
                    sendOrderBook(eventId);
                    updatePrice(eventId, price);
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
                    updateBalance(eventBids[i], eventId, userId, price, remainingQty, side);
                    sendOrderBook(eventId);
                    updatePrice(eventId, price);
                    return 0;
                }
                else {
                    remainingQty -= eventBids[i].quantity;
                    updateBalance(eventBids[i], eventId, userId, price, eventBids[i].quantity, side);
                    sendOrderBook(eventId);
                    updatePrice(eventId, price);
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

function updatePrice(eventId: string, priceNow: number) {
    const prices = price.get(eventId) || [];

    const currentPrice = { value: priceNow, time: Date.now() }; 

    prices.push(currentPrice);
    price.set(eventId, prices);
    
    io.emit('priceChanged', currentPrice);
}

export function sendOrderBook(eventId: string) {
    const eventBids = bids.get(eventId) || [];
    const eventAsks = asks.get(eventId) || [];
    
    const orders: {
        [price: number]: {
            side: 'bid' | 'ask',
            quantity: number
        }
    } = {};

    for (let i = 0; i < eventBids.length; i++) {
        if (!orders[eventBids[i].price]){
            orders[eventBids[i].price] = {
                side: 'bid',
                quantity: eventBids[i].quantity
            };
        }
        else {
            orders[eventBids[i].price].quantity += eventBids[i].quantity;
        }
    }
    
    for (let i = 0; i < eventAsks.length; i++) {
        if (!orders[eventAsks[i].price]){
            orders[eventAsks[i].price] = {
                side: 'ask',
                quantity: eventAsks[i].quantity
            };
        }
        else {
            orders[eventAsks[i].price].quantity += eventAsks[i].quantity;
        }
    }
    console.log(orders);
    io.emit('orderBook', orders);
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