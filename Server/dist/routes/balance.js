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
exports.balanceRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db/db");
const cashfree_1 = require("./cashfree");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.post('/createOrder', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const amount = parseInt(req.body.amount);
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        if (!userId) {
            res.json({ message: 'User not found' });
            return;
        }
        const payment = yield db_1.prismaClient.payment.create({
            data: {
                amount: amount,
                status: 'failed',
                createdBy: userId
            }
        });
        const response = yield (0, cashfree_1.createOrder)(userId, payment.id, amount);
        res.json(Object.assign(Object.assign({}, response), { paymentId: payment.id }));
    }
    catch (error) {
        console.error('payment.ts /createOrder');
        console.error(error);
        res.status(500).json({ message: 'Error creating order' });
    }
}));
const BalanceSchema = zod_1.z.object({
    amount: zod_1.z.number(),
    paymentId: zod_1.z.string()
});
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { amount, paymentId } = BalanceSchema.parse(req.body);
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        if (!userId) {
            res.json({ message: 'User not found' });
            return;
        }
        yield db_1.prismaClient.$transaction([
            db_1.prismaClient.payment.update({
                where: {
                    id: paymentId
                },
                data: {
                    status: 'successfull'
                }
            }),
            db_1.prismaClient.user.update({
                where: {
                    id: userId
                },
                data: {
                    balance: {
                        increment: amount
                    }
                }
            })
        ]);
        const user = yield db_1.prismaClient.user.findUnique({
            where: {
                id: userId
            }
        });
        res.json({ balance: user === null || user === void 0 ? void 0 : user.balance });
    }
    catch (error) {
        console.error('payment.ts /');
        console.error(error);
        res.status(500).json({ message: 'Error adding balance' });
    }
}));
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        if (!userId) {
            res.json({ message: 'User not found' });
            return;
        }
        const user = yield db_1.prismaClient.user.findUnique({
            where: {
                id: userId
            }
        });
        res.json({ balance: user === null || user === void 0 ? void 0 : user.balance });
    }
    catch (error) {
        console.error('payment.ts /');
        console.error(error);
        res.status(500).json({ message: 'Error fetching payments' });
    }
}));
router.get('/allPayments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.json({ message: 'User not found' });
            return;
        }
        const payments = yield db_1.prismaClient.payment.findMany({
            where: {
                createdBy: userId.toString()
            }
        });
        res.json({ payments });
    }
    catch (error) {
        console.error('payment.ts /');
        console.error(error);
        res.status(500).json({ message: 'Error fetching payments' });
    }
}));
exports.balanceRouter = router;
