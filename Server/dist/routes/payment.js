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
exports.paymentRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db/db");
const Cashfree_1 = require("./Cashfree");
const router = (0, express_1.Router)();
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const amount = req.body.amount;
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        if (!userId) {
            res.json({ message: 'User not found' });
            return;
        }
        const response = yield (0, Cashfree_1.createOrder)(userId, amount);
        yield db_1.prismaClient.payment.create({
            data: {
                amount,
                createdBy: userId
            }
        });
        res.json(response);
    }
    catch (error) {
        console.error('payment.ts /');
        console.error(error);
        res.status(500).json({ message: 'Error saving payment' });
    }
}));
// router.post('/capture', async (req: Request, res: Response) => {
//     try { 
//         const paymentId: number = req.body.paymentId; 
//         if (!paymentId) {
//             res.json({ message: 'Payment id not found' });
//             return;
//         }
//         const { jsonResponse, httpStatusCode } = await captureOrder(paymentId.toFixed(2).toString());
//         if (httpStatusCode !== 200) {
//             throw new Error('Paypal order cannot be created');
//         }
//         res.json(jsonResponse);
//     }
//     catch (error) {
//         console.error('payment.ts /');
//         console.error(error);
//         res.status(500).json({ message: 'Error capturing payment' });
//     }
// });
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.paymentRouter = router;
