import { Router, Request, Response } from "express";
import { z } from "zod";
import { prismaClient } from "../db/db";
import { io } from "../socket/websocket";
import { runningIPOs } from "../lib/cronJob";
import { Prisma } from "@prisma/client";
import { cache } from "../redis/redis";

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

router.post('/ipo', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        const { eventId, price, quantity, side } = OrderSchema.parse(req.body);

        if (side === 'ask') {
            res.json({ message: "Sell order can't be placed during IPO Phase" });
            return;
        }

        const user = await prismaClient.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            res.status(404).json({ message: "User Not Found" });
            return;
        }

        if (user?.balance < price * quantity) {
            res.status(500).json({ message: "Enough balance not available" });
            return;
        }

        if (runningIPOs.has(eventId)) {
            await prismaClient.user.update({
                where: {
                    id: userId
                },
                data: {
                    balance: {
                        decrement: price * quantity
                    }
                }
            });

            await createIpoOrder(eventId, userId!, price, quantity, side);
            
            increaseHoldings( userId!, eventId, quantity);
            updatePrice(eventId, price);

            res.json({ message: 'Order placed successfully' });
            return;
        }
        res.json({ message: "IPO ended, can't place order" });
    }
    catch (error) {
        console.error('trade.ts /ipo');
        console.error(error);
        res.status(500).json()
    }
});

async function createIpoOrder(eventId: string, userId: string, price: number, quantity: number, side: 'bid' | 'ask') {
    try {
        const orderId = await createOrder(eventId, userId!, price, quantity, side);

        if (!orderId) {
            throw new Error('No order id');
        }

        await prismaClient.order.update({
            where: {
                id: orderId
            },
            data: {
                remainingQty: 0
            }
        });
    }
    catch (error) {
        throw error;
    }
}

// The event is added in map in cron job
export const bids: Map<string, Order[]> = new Map();
export const asks: Map<string, Order[]> = new Map();
const holdings: Map<string, { 
    quantity: number, 
    eventId: string,
    lockedQty: number 
}[]> = new Map();
export const price: Map<string, { value: number, time: number }[]> = new Map();

async function createOrder(eventId: string, userId: string, price: number, quantity: number, side: 'bid' | 'ask') {
    try {
        const order = await prismaClient.order.create({
            data: {
                eventId,
                createdBy: userId,
                price,
                quantity,
                remainingQty: quantity,
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

    const hasEnoughBalance = (user.balance - user.lockedBalance) > price * quantity; 
    if (side === 'bid') {
        if (!hasEnoughBalance) {
            res.status(500).json({ message: 'Enough balance not available' });
            return;
        }
        await lockBalance(user.id, price * quantity);
    }
    else {
        const userHoldings = holdings.get(userId);
        if (userHoldings) {
            let totalQty = 0;
            let lockedQty = 0;
            userHoldings.forEach(holding => {
                if (
                    holding.eventId === eventId
                ) {
                    totalQty = holding.quantity;
                    lockedQty = holding.lockedQty;
                }
            });
            if (quantity > (totalQty - lockedQty)) {
                res.status(409).json({ message: 'Not enough holdings to sell stock' });
                return;
            }
        }
        else {
            res.status(409).json({ message: 'Not enough holdings to sell stock' });
            return;
        }

        await lockHolding(user.id, eventId, quantity);
    }

    const orderId = await createOrder(eventId, userId, price, quantity, side);
    if (!orderId) {
        res.json(500).json({ message: 'Error creating error' });
        return;
    }
    const remainingQty = await fillOrder(eventId, userId, price , quantity, side, orderId);

    if (remainingQty === 0){
        res.json({ message: 'Order placed successfully', quantity: 0 });
        return;
    }

    const order = {
        orderId: orderId!,
        price,
        quantity: remainingQty,
        userId
    };
    
    if (side === 'bid') {
        const eventBids = bids.get(eventId) || [];
        
        eventBids.push(order);
        eventBids.sort((a, b) => a.price - b.price);
        bids.set(eventId, eventBids);
        sendOrderBook(eventId);
    }
    else {
        const eventAsks = asks.get(eventId) || [];

        eventAsks.push(order);
        eventAsks.sort((a, b) => b.price - a.price);
        asks.set(eventId, eventAsks);
        sendOrderBook(eventId);
    }
    res.json({ message: 'Order placed successfully', quantity: quantity - remainingQty });
}); 

async function lockHolding(userId: string, eventId: string, quantity: number) {
    try {
        const userHoldings = holdings.get(userId);

        if (!userHoldings) {
            throw new Error('No holding for user id');
        }

        userHoldings.forEach(holding => {
            if (holding.eventId === eventId) {
                holding.lockedQty += quantity;
            }
        });
    }
    catch (error) {
        console.error('order.ts lockHolding');
        console.error(error);
    }
}

async function lockBalance(userId: string, amount: number) {
    try {
        await prismaClient.user.update({
            where: {
                id: userId
            },
            data: {
                lockedBalance: {
                    increment: amount
                }
            }
        });
    }
    catch (error) {
        console.error('order.ts lockBalance');
        console.error(error);
    }
}

async function unlockBalance(userId: string, amount: number) {
    try {
        await prismaClient.user.update({
            where: {
                id: userId
            },
            data: {
                lockedBalance: {
                    decrement: amount
                }
            }
        });
    }
    catch (error) {
        console.error('order.ts unlockBalance');
        console.error(error);
    }
}

export async function unlockBalanceForEvent(eventId: string) {
    try {
        const event = await prismaClient.event.findUnique({
            where: {
                id: eventId
            },
            include: {
                orders: true
            } 
        });

        if (!event) {
            return;
        }

        await prismaClient.order.updateMany({
            where: {
                id: {
                    in: event.orders.map(o => o.id)
                }
            },
            data: {
                remainingQty: 0
            }
        });
    }
    catch (error) {
        console.error('order.ts unlockBalanceForEvent');
        console.error(error);
    }
}

async function fillOrder(eventId: string, userId: string, price: number, quantity: number, side: 'bid' | 'ask', orderId: string): Promise<number> {
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
                    updateInfo(eventId, eventAsks[i], userId, price, remainingQty, side, orderId);
                    console.log({ sellerId: eventAsks[i].userId, buyerId: userId, price, quantity: remainingQty });
                    return 0;
                }
                else {
                    remainingQty -= eventAsks[i].quantity;
                    updateInfo(eventId, eventAsks[i], userId, price, eventAsks[i].quantity, side, orderId);
                    console.log({ sellerId: eventAsks[i].userId, buyerId: userId, price, quantity: eventAsks[i].quantity });
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
                    updateInfo(eventId, eventBids[i], userId, price, remainingQty, side, orderId);
                    console.log({ sellerId: userId, buyerId: eventBids[i].userId, price, quantity: remainingQty });
                    return 0;
                }
                else {
                    remainingQty -= eventBids[i].quantity;
                    updateInfo(eventId, eventBids[i], userId, price, eventBids[i].quantity, side, orderId);
                    console.log({ sellerId: userId, buyerId: eventBids[i].userId, price, quantity: eventBids[i].quantity });
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

async function updateInfo(eventId: string, order: Order, userId: string, price: number, quantity: number, side: 'ask' | 'bid', orderId: string) {
    await updateBalance(order, userId, price, quantity, side, orderId);
    if (side === 'bid') {
        unlockBalance(userId, price * quantity);
        increaseHoldings(userId, eventId, quantity);
        decreaseHoldings(order.userId, eventId, quantity);
    }
    else {
        unlockBalance(order.userId, order.price * quantity);
        decreaseHoldings(userId, eventId, quantity);
        increaseHoldings(order.userId, eventId, quantity);
    }
    updatePrice(eventId, price);
    sendOrderBook(eventId);
}

function increaseHoldings(userId: string, eventId: string, quantity: number) {
    const userHoldings = holdings.get(userId);
    const order = {
        eventId,
        quantity,
        lockedQty: 0
    };

    if (!userHoldings) {
        holdings.set(userId, [order]);
        return;
    }

    let alreadyExists = false;
    userHoldings.forEach(holding => {
        if (holding.eventId === eventId) {
            holding.quantity += quantity;
            alreadyExists = true;
        }
    });
    
    if (!alreadyExists) {
        userHoldings.push(order);
    }
}

function decreaseHoldings(userId: string, eventId: string, quantity: number) {
    const userHoldings = holdings.get(userId);
  
    if (!userHoldings) {
        return;
    }

    const updatedHoldings = userHoldings.filter(holding => {
        if (holding.eventId === eventId) {
            holding.quantity -= quantity;
            holding.lockedQty -= quantity;
        }
        return holding.quantity > 0;
    });

    holdings.set(userId, updatedHoldings);
}

async function updateBalance(matchedOrder: Order, userId: string, price: number, quantity: number, side: 'bid' | 'ask', orderId: string) {
    try {
        const bidPrice = side === 'bid' ? price : matchedOrder.price; 
        const askPrice = side === 'ask' ? price : matchedOrder.price; 

        const buyerBalance = bidPrice * quantity;
        const sellerBalance = askPrice * quantity;

        const buyerId = side === 'bid' ? userId : matchedOrder.userId;
        const sellerId = side === 'ask' ? userId : matchedOrder.userId;

        const buyerOrderId = side === 'bid' ? orderId : matchedOrder.orderId;
        const sellerOrderId = side === 'ask' ? orderId : matchedOrder.orderId;

        // You can take the difference between the prices
        const platformFee = buyerBalance - sellerBalance;
        
        await prismaClient.$transaction([
            prismaClient.user.update({
                where: { 
                    id: buyerId 
                },
                data: {
                    balance: {
                        decrement: buyerBalance
                    },
                }
            }),
            prismaClient.user.update({
                where: {
                    id: sellerId
                },
                data: {
                    balance: {
                        increment: sellerBalance
                    }
                }
            }),
            prismaClient.order.update({
                where: { 
                    id: buyerOrderId
                },
                data: {
                    remainingQty: {
                        decrement: quantity
                    }
                }
            }),
            prismaClient.order.update({
                where: { 
                    id: sellerOrderId
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

    const currentPrice = { value: priceNow, time: Math.floor(Date.now() / 1000) }; 

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

async function getOrders(filter: any, page: number, pageSize: number) {
    return await prismaClient.order.findMany({
        ...filter,
        include: {
            event: {
                select: {
                    title: true
                }
            },
        },
        orderBy: {
            createdAt: 'desc'
        },
        skip: (page - 1) * pageSize,
        take: pageSize
    });
}

async function getTotalRows(filter: any) {
    return (await prismaClient.order.findMany(filter)).length;
}

router.get('/all', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string);
        const pageSize = parseInt(req.query.pageSize as string);
        const searchTerm = req.query.searchTerm as string | undefined;

        const userId = req.auth?.payload.sub;

        const filter = {
            where: {
                user: {
                    id: userId
                },
                ...(searchTerm && {
                    event: {
                        title: {
                            contains: searchTerm.toString(),
                            mode: Prisma.QueryMode.insensitive
                        }
                    }
                })
            },
        };

        let orders;
        let totalRows;
        if (!searchTerm) {
            const orderKey = `orders:userId=${userId}:page=${page}:pageSize=${pageSize}`;
            const totalRowsKey = `orderTotalRows:userId=${userId}`;

            orders = await cache(orderKey, async () => await getOrders(filter, page, pageSize), 300);
            totalRows = await cache(totalRowsKey, async () => await getTotalRows(filter), 300);
        }
        else {
            orders = await getOrders(filter, page, pageSize);
            totalRows = await getTotalRows(filter);
        }

        res.json({ orders, totalRows });
    }
    catch (error) {
        console.error('order.ts /');
        console.error(error);
        res.status(500).json({ message: 'Error fetching data' });
    }
});

router.get('/holdings', async (req: Request, res: Response) => {
    try {
        const userId = await req.auth?.payload.sub;

        const userHoldings = holdings.get(userId!);

        if (!userHoldings) {
            res.json({ holdings: [] });
            return;
        }

        const eventCache = new Map<string, string>();
        const data: {
            eventId: string,
            eventTitle: string,
            quantity: number,
            lockedQty: number
        }[] = [];

        for (const holding of userHoldings) {
            let eventTitle: string;

            if (eventCache.has(holding.eventId)) {
                eventTitle = eventCache.get(holding.eventId)!;
            } else {
                const holdingEvent = await prismaClient.event.findUnique({
                    where: {
                        id: holding.eventId
                    }
                });

                if (!holdingEvent) {
                    continue;
                }

                eventTitle = holdingEvent.title;
                eventCache.set(holding.eventId, eventTitle);
            }

            data.push({
                eventId: holding.eventId,
                eventTitle,
                quantity: holding.quantity,
                lockedQty: holding.lockedQty
            });
        }

        res.json({ holdings: data });
    }
    catch (error) {
        console.error('order.ts holdings');
        console.error(error);
        res.status(500).json({ message: 'Error fetching data' });
    }
});

export async function saveHoldings(eventId: string) {
    try {
        const data:{
            eventId: string,
            userId: string,
            quantity: number
        }[] = [];

        for (const [userId, userHoldings] of holdings) {
            if (userHoldings.length === 0) {
                holdings.delete(userId);
                continue;
            }
            const updatedHoldings = userHoldings.filter(holding => {
                if (holding.eventId === eventId) {
                    data.push({
                        userId,
                        eventId,
                        quantity: holding.quantity
                    });
                    return false;
                }
                return true;
            });

            holdings.set(userId, updatedHoldings);
        }

        await prismaClient.holding.createMany({ data });
    }
    catch (error) {
        console.error('order.ts saveHoldings');
        console.error(error);
    }
}    

router.get('/expiredHoldings', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;

        const holdings = await prismaClient.holding.findMany({
            where: {
                userId 
            },
            include: {
                event: {
                    select: {
                        title: true
                    }
                },
            }
        });

        res.json({ holdings });
    }
    catch (error) {
        console.error('order.ts /expiredHoldings');
        console.error(error);
        res.status(500).json({ message: 'Some error fetching data' });
    }
})

router.get('/prices', (req: Request, res: Response) => {
    const { eventId } = req.query;

    if (eventId?.toString()){
        const prices = price.get(eventId?.toString()) || [];
        res.json({ prices });
        return;
    }

    res.status(500).json({ message: 'Wrong event id' });
});

export async function savePricePoints(eventId: string) {
    try {
        const pricePoints = price.get(eventId);

        if (!pricePoints) {
            return;
        }

        await prismaClient.pricePoints.createMany({
            data: pricePoints.map(p => ({ eventId, value: p.value, time: p.time.toString() }))
        });

        price.delete(eventId);
    }
    catch (error) {
        console.error('order.ts savePricePoints');
        console.error(error);
    }
}

async function getPricePoints(eventId: string) {
    return await prismaClient.event.findUnique({
        where: {
            id: eventId
        },
        include: {
            pricePoints: true
        }
    });
}

router.get('/pricePoints', async (req: Request, res: Response) => {
    try {
        const eventId = req.query.eventId?.toString();

        if (!eventId) {
            res.status(400).json({ message: 'Event id not found' });
            return;
        }

        const event = await cache(`events:pricePoints:eventId${eventId}`, async () => await getPricePoints(eventId), 300);
        
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        res.json({ pricePoints: event.pricePoints });
    }
    catch (error) {
        console.error('order.ts /pricePoints');
        console.error(error);
        res.status(500).json({ message: 'Some error fetching data' });
    }
});

export const orderRouter = router;