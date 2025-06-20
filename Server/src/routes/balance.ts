import { Router, Request, Response } from "express";
import { prismaClient } from "../db/db";
import { createOrder } from "./cashfree";
import { z } from "zod";

const router = Router();

router.post('/createOrder', async (req: Request, res: Response) => {
    try { 
        const amount: number = parseInt(req.body.amount);
        const userId = req.auth?.payload.sub;

        if (!userId) {
            res.json({ message: 'User not found' });
            return;
        }

        const payment = await prismaClient.payment.create({
            data: {
                amount: amount,
                status: 'failed',
                createdBy: userId
            }
        });

        const response = await createOrder(userId, payment.id, amount);
        res.json({ ...response, paymentId: payment.id});
    }
    catch (error) {
        console.error('payment.ts /createOrder');
        console.error(error);
        res.status(500).json({ message: 'Error creating order' });
    }
});

const BalanceSchema = z.object({
    amount: z.number(),
    paymentId: z.string()
});
router.post('/', async (req: Request, res: Response) => {
    try { 
        const { amount, paymentId} = BalanceSchema.parse(req.body);
        const userId = req.auth?.payload.sub;

        if (!userId) {
            res.json({ message: 'User not found' });
            return;
        }

        await prismaClient.$transaction([
            prismaClient.payment.update({
                where: {
                    id: paymentId
                },
                data: {
                    status: 'successfull'
                }
            }),
            prismaClient.user.update({
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


        const user = await prismaClient.user.findUnique({
            where: {
                id: userId
            }
        });

        res.json({ balance: user?.balance });
    }
    catch (error) {
        console.error('payment.ts /');
        console.error(error);
        res.status(500).json({ message: 'Error adding balance' });
    }
});

router.get('/', async (req: Request, res: Response) => {
    try { 
        const userId = req.auth?.payload.sub;
        
        if (!userId) {
            res.json({ message: 'User not found' });
            return;
        }

       const user = await prismaClient.user.findUnique({
            where: {
                id: userId
            }
        });

        res.json({ balance: user?.balance });
    }
    catch (error) {
        console.error('payment.ts /');
        console.error(error);
        res.status(500).json({ message: 'Error fetching payments' });
    }
});

router.get('/allPayments', async (req: Request, res: Response) => {
    try { 
        const { userId } = req.query; 
        
        if (!userId) {
            res.json({ message: 'User not found' });
            return;
        }

       const payments = await prismaClient.payment.findMany({
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
});

export const balanceRouter = router;