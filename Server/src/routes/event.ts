import { Request, Response, Router } from "express";
import { prismaClient } from "../db/db";
import { z } from "zod";
import getDate from "../common/common";
import { sendOrderBook } from "./order";

const router = Router();

export const eventSchema = z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const data = eventSchema.parse(req.body);
        
        await prismaClient.event.create({
            data: {
                title: data.title,
                description: data.description,
                category: data.category,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                createdBy: req.auth?.payload.sub!,
            }
        });

        res.json({ message: 'Event created successfully' });
    }
    catch (error){
        console.error('event.ts POST');
        console.error(error);
        res.status(500).json({ message: 'Error saving event' });
    }
});

router.get('/all', async (req: Request, res: Response) => {
    try {
        const { page, pageSize, searchTerm } = req.query;

        const filters: any = {
            ...(searchTerm?.toString() && {
                title: {
                    contains: searchTerm.toString(),
                    mode: 'insensitive'
                },
            }),
            status: true
        };

        const totalRows = await prismaClient.event.count({
            where: filters
        });

        const events = await prismaClient.event.findMany({
            where: filters,
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                date: true,
                startTime: true,
                endTime: true,
            },
            take: Number(pageSize),
            skip: (Number(page) - 1) * Number(pageSize)
        });

        res.json({ events, totalRows });
    }
    catch(e){
        console.error('event.ts GET /all');
        console.error(e);
        res.status(500).json({ message: 'Some error fetching data' });
    }
}); 

router.get('/', async (req: Request, res: Response) => {
    try {
        const { id } = req.query;
        const event = await prismaClient.event.findUnique({
            where: {
                id: id?.toString()
            }
        });

        res.json({ event });
    }
    catch(error) {
        console.error('event.ts GET /');
        console.error(error);
        res.status(500).json({ message: 'Some error fetching data' });
    }
});

router.get('/isRunning', async (req: Request, res: Response) => {
    try {
        const { eventId } = req.query;
        const event = await prismaClient.event.findUnique({
            where: {
                id: eventId?.toString(),
                date: new Date().toISOString().split('T')[0]
            }
        });
        
        if (!event) {
            res.json({ isRunning: false });
            return;
        }

        const startDate = getDate(event.startTime);
        const endDate = getDate(event.endTime);

        if (startDate <= new Date() && new Date() < endDate){
            res.json({ isRunning: true });
            sendOrderBook(event.id);
            return;
        }
        res.json({ isRunning: false });
    }
    catch(error) {
        console.error('event.ts /isActive');
        console.error(error);
        res.status(500).json({ message: 'Some error fetching data' });
    }
});

export const eventRouter = router;