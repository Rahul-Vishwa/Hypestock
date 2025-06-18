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
exports.price = exports.asks = exports.bids = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db/db");
const inspector_1 = require("inspector");
const websocket_1 = require("../socket/websocket");
const router = (0, express_1.Router)();
const OrderSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    userId: zod_1.z.string(),
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
            inspector_1.console.error('trade.ts createOrder');
            inspector_1.console.error(error);
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
            inspector_1.console.error('trade.ts updateBalance');
            inspector_1.console.error(error);
        }
    });
}
router.post('/order', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId, userId, price, quantity, side } = OrderSchema.parse(req.body);
    const remainingQty = fillOrder(eventId, userId, price, quantity, side);
    const orderId = yield createOrder(eventId, userId, price, quantity, remainingQty, side);
    if (remainingQty === 0) {
        res.json({ quantity: 0 });
        return;
    }
    if (side === 'bid') {
        const eventBids = exports.bids.get(eventId);
        eventBids.push({
            orderId: orderId,
            price,
            quantity: remainingQty,
            userId
        });
        eventBids.sort((a, b) => a.price - b.price);
    }
    else {
        const eventAsks = exports.asks.get(eventId);
        eventAsks.push({
            orderId: orderId,
            price,
            quantity: remainingQty,
            userId
        });
        eventAsks.sort((a, b) => b.price - a.price);
    }
    res.json({ quantity: quantity - remainingQty });
}));
function fillOrder(eventId, userId, price, quantity, side) {
    try {
        let remainingQty = quantity;
        if (side === 'bid') {
            const eventAsks = exports.asks.get(eventId);
            for (let i = eventAsks.length - 1; i >= 0; i--) {
                if (eventAsks[i].price > price) {
                    break;
                }
                if (eventAsks[i].quantity > remainingQty) {
                    eventAsks[i].quantity -= remainingQty;
                    updateBalance(eventAsks[i], eventId, userId, price, remainingQty, side);
                    updatePrice(eventId, price);
                    return 0;
                }
                else {
                    remainingQty -= eventAsks[i].quantity;
                    updateBalance(eventAsks[i], eventId, userId, price, eventAsks[i].quantity, side);
                    updatePrice(eventId, price);
                    eventAsks.splice(i, 1);
                }
            }
        }
        else {
            const eventBids = exports.bids.get(eventId);
            for (let i = eventBids.length - 1; i >= 0; i--) {
                if (eventBids[i].price < price) {
                    break;
                }
                if (eventBids[i].quantity > remainingQty) {
                    eventBids[i].quantity -= remainingQty;
                    updateBalance(eventBids[i], eventId, userId, price, remainingQty, side);
                    updatePrice(eventId, price);
                    return 0;
                }
                else {
                    remainingQty -= eventBids[i].quantity;
                    updateBalance(eventBids[i], eventId, userId, price, eventBids[i].quantity, side);
                    updatePrice(eventId, price);
                    eventBids.splice(i, 1);
                }
            }
            return remainingQty;
        }
        return 0;
    }
    catch (error) {
        inspector_1.console.error('trade.ts fillOrder');
        inspector_1.console.error(error);
        return 0;
    }
}
function updatePrice(eventId, priceNow) {
    exports.price.set(eventId, priceNow);
    websocket_1.io.emit('priceChanged', priceNow);
}
