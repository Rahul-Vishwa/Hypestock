import { Router, Request, Response } from "express";
import { z } from "zod";
import { prismaClient } from "../db/db";

const router = Router();

const UserSchema = z.object({
    email: z.string(),
    nickName: z.string(),
    name: z.string()
});

router.post('/', async (req: Request, res: Response) => {
    try{
        const { email, nickName, name } = UserSchema.parse(req.body);
        const userId = req.auth?.payload.sub;

        const user = await prismaClient.user.findFirst({
            where: {
                id: userId
            }
        });
        if (user) {
            res.json({ message: 'User already exists' });
            return;
        }

        await prismaClient.user.create({
            data: {
                id: userId!,
                email,
                nickName,
                name
            }
        });
        res.json({ message: 'User created successfully' });
    }
    catch(e) {
        console.error('user.ts POST');
        console.error(e);
        res.status(500).json({ message: 'Some error saving data' });
    }
});

export const userRouter = router;