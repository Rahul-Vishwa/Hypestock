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
exports.sendOrderBook = sendOrderBook;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db/db");
const websocket_1 = require("../socket/websocket");
const router = (0, express_1.Router)();
const OrderSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    price: zod_1.z.number(),
    quantity: zod_1.z.number(),
    side: zod_1.z.enum(['bid', 'ask'])
});
// TODO: cancel order if bids or asks cannot be fulfilled
// TODO: check balance before bidding
// The event is added in map in cron job
exports.bids = new Map();
exports.asks = new Map();
exports.price = new Map();
function createOrder(eventId, userId, price, quantity, remainingQty, side) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const order = yield db_1.prismaClient.order.create({
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
    });
}
function updateBalance(data, eventId, userId, price, quantity, side) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const thisUserBalance = (price * quantity);
            const otherUserBalance = (data.price * quantity);
            // You can take the difference between the prices
            yield db_1.prismaClient.$transaction([
                db_1.prismaClient.user.update({
                    where: {
                        id: userId
                    },
                    data: {
                        balance: {
                            increment: side === 'ask' ? thisUserBalance : (-1 * thisUserBalance)
                        }
                    }
                }),
                db_1.prismaClient.user.update({
                    where: {
                        id: data.userId
                    },
                    data: {
                        balance: {
                            increment: side === 'bid' ? otherUserBalance : (-1 * otherUserBalance)
                        }
                    }
                }),
                db_1.prismaClient.order.update({
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
    });
}
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { eventId, price, quantity, side } = OrderSchema.parse(req.body);
    console.log(price, quantity);
    const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
    if (!userId) {
        res.status(401).json({ message: 'User not found' });
        return;
    }
    const remainingQty = fillOrder(eventId, userId, price, quantity, side);
    console.log(remainingQty, 'remaingingQty');
    const orderId = yield createOrder(eventId, userId, price, quantity, remainingQty, side);
    if (remainingQty === 0) {
        res.json({ quantity: 0 });
        return;
    }
    if (side === 'bid') {
        const eventBids = exports.bids.get(eventId) || [];
        eventBids.push({
            orderId: orderId,
            price,
            quantity: remainingQty,
            userId
        });
        eventBids.sort((a, b) => a.price - b.price);
        exports.bids.set(eventId, eventBids);
        sendOrderBook(eventId);
    }
    else {
        const eventAsks = exports.asks.get(eventId) || [];
        eventAsks.push({
            orderId: orderId,
            price,
            quantity: remainingQty,
            userId
        });
        eventAsks.sort((a, b) => b.price - a.price);
        exports.asks.set(eventId, eventAsks);
        sendOrderBook(eventId);
    }
    res.json({ quantity: quantity - remainingQty });
}));
function fillOrder(eventId, userId, price, quantity, side) {
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
            const eventBids = exports.bids.get(eventId) || [];
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
function updatePrice(eventId, priceNow) {
    const prices = exports.price.get(eventId) || [];
    const currentPrice = { value: priceNow, time: Date.now() };
    prices.push(currentPrice);
    exports.price.set(eventId, prices);
    websocket_1.io.emit('priceChanged', currentPrice);
}
function sendOrderBook(eventId) {
    const eventBids = exports.bids.get(eventId) || [];
    const eventAsks = exports.asks.get(eventId) || [];
    const orders = {};
    for (let i = 0; i < eventBids.length; i++) {
        if (!orders[eventBids[i].price]) {
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
        if (!orders[eventAsks[i].price]) {
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
    websocket_1.io.emit('orderBook', orders);
}
router.get('/prices', (req, res) => {
    const { eventId } = req.query;
    if (eventId === null || eventId === void 0 ? void 0 : eventId.toString()) {
        const prices = exports.price.get(eventId === null || eventId === void 0 ? void 0 : eventId.toString()) || [];
        res.json({ prices });
        return;
    }
    res.status(500).json({ message: 'Wrong event id' });
});
exports.orderRouter = router;
