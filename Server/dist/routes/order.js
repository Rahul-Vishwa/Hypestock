"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRouter = exports.price = exports.asks = exports.bids = void 0;
exports.unlockBalanceForEvent = unlockBalanceForEvent;
exports.sendOrderBook = sendOrderBook;
exports.saveHoldings = saveHoldings;
exports.savePricePoints = savePricePoints;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db/db");
const websocket_1 = require("../socket/websocket");
const cronJob_1 = require("../lib/cronJob");
const client_1 = require("@prisma/client");
const redis_1 = require("../redis/redis");
const router = (0, express_1.Router)();
const OrderSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    price: zod_1.z.number(),
    quantity: zod_1.z.number(),
    side: zod_1.z.enum(['bid', 'ask'])
});
router.post('/ipo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        const { eventId, price, quantity, side } = OrderSchema.parse(req.body);
        if (side === 'ask') {
            res.json({ message: "Sell order can't be placed during IPO Phase" });
            return;
        }
        const user = yield db_1.prismaClient.user.findUnique({
            where: {
                id: userId
            }
        });
        if (!user) {
            res.status(404).json({ message: "User Not Found" });
            return;
        }
        if ((user === null || user === void 0 ? void 0 : user.balance) < price * quantity) {
            res.status(500).json({ message: "Enough balance not available" });
            return;
        }
        if (cronJob_1.runningIPOs.has(eventId)) {
            yield db_1.prismaClient.user.update({
                where: {
                    id: userId
                },
                data: {
                    balance: {
                        decrement: price * quantity
                    }
                }
            });
            yield createIpoOrder(eventId, userId, price, quantity, side);
            increaseHoldings(userId, eventId, quantity);
            updatePrice(eventId, price);
            res.json({ message: 'Order placed successfully' });
            return;
        }
        res.json({ message: "IPO ended, can't place order" });
    }
    catch (error) {
        console.error('trade.ts /ipo');
        console.error(error);
        res.status(500).json();
    }
}));
function createIpoOrder(eventId, userId, price, quantity, side) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const orderId = yield createOrder(eventId, userId, price, quantity, side);
            if (!orderId) {
                throw new Error('No order id');
            }
            yield db_1.prismaClient.order.update({
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
    });
}
// The event is added in map in cron job
exports.bids = new Map();
exports.asks = new Map();
const holdings = new Map();
exports.price = new Map();
function createOrder(eventId, userId, price, quantity, side) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const order = yield db_1.prismaClient.order.create({
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
    });
}
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { eventId, price, quantity, side } = OrderSchema.parse(req.body);
    const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
    const user = yield db_1.prismaClient.user.findUnique({
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
        yield lockBalance(user.id, price * quantity);
    }
    else {
        const userHoldings = holdings.get(userId);
        if (userHoldings) {
            let totalQty = 0;
            let lockedQty = 0;
            userHoldings.forEach(holding => {
                if (holding.eventId === eventId) {
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
        yield lockHolding(user.id, eventId, quantity);
    }
    const orderId = yield createOrder(eventId, userId, price, quantity, side);
    if (!orderId) {
        res.json(500).json({ message: 'Error creating error' });
        return;
    }
    const remainingQty = yield fillOrder(eventId, userId, price, quantity, side, orderId);
    if (remainingQty === 0) {
        res.json({ message: 'Order placed successfully', quantity: 0 });
        return;
    }
    const order = {
        orderId: orderId,
        price,
        quantity: remainingQty,
        userId
    };
    if (side === 'bid') {
        const eventBids = exports.bids.get(eventId) || [];
        eventBids.push(order);
        eventBids.sort((a, b) => a.price - b.price);
        exports.bids.set(eventId, eventBids);
        sendOrderBook(eventId);
    }
    else {
        const eventAsks = exports.asks.get(eventId) || [];
        eventAsks.push(order);
        eventAsks.sort((a, b) => b.price - a.price);
        exports.asks.set(eventId, eventAsks);
        sendOrderBook(eventId);
    }
    res.json({ message: 'Order placed successfully', quantity: quantity - remainingQty });
}));
function lockHolding(userId, eventId, quantity) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function lockBalance(userId, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield db_1.prismaClient.user.update({
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
    });
}
function unlockBalance(userId, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield db_1.prismaClient.user.update({
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
    });
}
function unlockBalanceForEvent(eventId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const event = yield db_1.prismaClient.event.findUnique({
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
            yield db_1.prismaClient.order.updateMany({
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
    });
}
function fillOrder(eventId, userId, price, quantity, side, orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let remainingQty = quantity;
            if (side === 'bid') {
                const eventAsks = exports.asks.get(eventId) || [];
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
                const eventBids = exports.bids.get(eventId) || [];
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
    });
}
function updateInfo(eventId, order, userId, price, quantity, side, orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield updateBalance(order, userId, price, quantity, side, orderId);
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
    });
}
function increaseHoldings(userId, eventId, quantity) {
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
function decreaseHoldings(userId, eventId, quantity) {
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
function updateBalance(matchedOrder, userId, price, quantity, side, orderId) {
    return __awaiter(this, void 0, void 0, function* () {
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
            yield db_1.prismaClient.$transaction([
                db_1.prismaClient.user.update({
                    where: {
                        id: buyerId
                    },
                    data: {
                        balance: {
                            decrement: buyerBalance
                        },
                    }
                }),
                db_1.prismaClient.user.update({
                    where: {
                        id: sellerId
                    },
                    data: {
                        balance: {
                            increment: sellerBalance
                        }
                    }
                }),
                db_1.prismaClient.order.update({
                    where: {
                        id: buyerOrderId
                    },
                    data: {
                        remainingQty: {
                            decrement: quantity
                        }
                    }
                }),
                db_1.prismaClient.order.update({
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
    });
}
function updatePrice(eventId, priceNow) {
    const prices = exports.price.get(eventId) || [];
    const currentPrice = { value: priceNow, time: Math.floor(Date.now() / 1000) };
    prices.push(currentPrice);
    exports.price.set(eventId, prices);
    websocket_1.io.emit('priceChanged', currentPrice);
}
function getOrderBook(eventId) {
    const eventBids = exports.bids.get(eventId) || [];
    const eventAsks = exports.asks.get(eventId) || [];
    const order = {};
    for (let i = 0; i < eventBids.length; i++) {
        if (!order[eventBids[i].price]) {
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
        if (!order[eventAsks[i].price]) {
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
function sendOrderBook(eventId) {
    const orderBook = getOrderBook(eventId);
    websocket_1.io.emit('orderBook', orderBook);
}
function getOrders(filter, page, pageSize) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield db_1.prismaClient.order.findMany(Object.assign(Object.assign({}, filter), { include: {
                event: {
                    select: {
                        title: true
                    }
                },
            }, orderBy: {
                createdAt: 'desc'
            }, skip: (page - 1) * pageSize, take: pageSize }));
    });
}
function getTotalRows(filter) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield db_1.prismaClient.order.findMany(filter)).length;
    });
}
router.get('/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = parseInt(req.query.page);
        const pageSize = parseInt(req.query.pageSize);
        const searchTerm = req.query.searchTerm;
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        const filter = {
            where: Object.assign({ user: {
                    id: userId
                } }, (searchTerm && {
                event: {
                    title: {
                        contains: searchTerm.toString(),
                        mode: client_1.Prisma.QueryMode.insensitive
                    }
                }
            })),
        };
        let orders;
        let totalRows;
        if (!searchTerm) {
            const orderKey = `orders:userId=${userId}:page=${page}:pageSize=${pageSize}`;
            const totalRowsKey = `orderTotalRows:userId=${userId}`;
            orders = yield (0, redis_1.cache)(orderKey, () => __awaiter(void 0, void 0, void 0, function* () { return yield getOrders(filter, page, pageSize); }), 300);
            totalRows = yield (0, redis_1.cache)(totalRowsKey, () => __awaiter(void 0, void 0, void 0, function* () { return yield getTotalRows(filter); }), 300);
        }
        else {
            orders = yield getOrders(filter, page, pageSize);
            totalRows = yield getTotalRows(filter);
        }
        res.json({ orders, totalRows });
    }
    catch (error) {
        console.error('order.ts /');
        console.error(error);
        res.status(500).json({ message: 'Error fetching data' });
    }
}));
router.get('/holdings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = yield ((_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub);
        const userHoldings = holdings.get(userId);
        if (!userHoldings) {
            res.json({ holdings: [] });
            return;
        }
        const eventCache = new Map();
        const data = [];
        for (const holding of userHoldings) {
            let eventTitle;
            if (eventCache.has(holding.eventId)) {
                eventTitle = eventCache.get(holding.eventId);
            }
            else {
                const holdingEvent = yield db_1.prismaClient.event.findUnique({
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
}));
function saveHoldings(eventId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = [];
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
            yield db_1.prismaClient.holding.createMany({ data });
        }
        catch (error) {
            console.error('order.ts saveHoldings');
            console.error(error);
        }
    });
}
router.get('/expiredHoldings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        const holdings = yield db_1.prismaClient.holding.findMany({
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
}));
router.get('/prices', (req, res) => {
    const { eventId } = req.query;
    if (eventId === null || eventId === void 0 ? void 0 : eventId.toString()) {
        const prices = exports.price.get(eventId === null || eventId === void 0 ? void 0 : eventId.toString()) || [];
        res.json({ prices });
        return;
    }
    res.status(500).json({ message: 'Wrong event id' });
});
function savePricePoints(eventId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pricePoints = exports.price.get(eventId);
            if (!pricePoints) {
                return;
            }
            yield db_1.prismaClient.pricePoints.createMany({
                data: pricePoints.map(p => ({ eventId, value: p.value, time: p.time.toString() }))
            });
            exports.price.delete(eventId);
        }
        catch (error) {
            console.error('order.ts savePricePoints');
            console.error(error);
        }
    });
}
function getPricePoints(eventId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield db_1.prismaClient.event.findUnique({
            where: {
                id: eventId
            },
            include: {
                pricePoints: true
            }
        });
    });
}
router.get('/pricePoints', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const eventId = (_a = req.query.eventId) === null || _a === void 0 ? void 0 : _a.toString();
        if (!eventId) {
            res.status(400).json({ message: 'Event id not found' });
            return;
        }
        const event = yield (0, redis_1.cache)(`events:pricePoints:eventId${eventId}`, () => __awaiter(void 0, void 0, void 0, function* () { return yield getPricePoints(eventId); }), 300);
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
}));
exports.orderRouter = router;
