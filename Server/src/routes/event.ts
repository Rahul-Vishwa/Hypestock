import { Request, Response, Router } from "express";
import { prismaClient } from "../db/db";
import { z } from "zod";
import getDate from "../common/common";
import { sendOrderBook } from "./order";
import { setStartTimeTimeOut, timeout } from "../lib/cronJob";

const router = Router();

export const EventSchema = z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const data = EventSchema.parse(req.body);
        
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

export const EventPatchSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
});
router.patch('/', async (req: Request, res: Response) => {
    try {
        const event = EventPatchSchema.parse(req.body);
        
        const filter = {
            where: {
                id: event.id
            }
        };
        const prevData = await prismaClient.event.findUnique(filter);

        if (prevData?.date !== event.date) {
            timeout.get(event.id)?.close();
        }
        else if (
            prevData?.startTime !== event.startTime ||
            prevData?.endTime !== event.endTime
        ) {
            timeout.get(event.id)?.close();
            setStartTimeTimeOut(event.id, event.startTime, event.endTime);
        }

        await prismaClient.event.update({
            ...filter,
            data: {
                title: event.title,
                description: event.description,
                category: event.category,
                date: event.date,
                startTime: event.startTime,
                endTime: event.endTime,
            }
        });

        res.json({ message: 'Event updated successfully' });
    }
    catch(e){
        console.error('event.ts PATCH /');
        console.error(e);
        res.status(500).json({ message: 'Some error fetching data' });
    }
});

router.get('/all', async (req: Request, res: Response) => {
    try {
        const { page, pageSize, searchTerm, myEvents } = req.query;
        const userId = req.auth?.payload.sub;

        const filters: any = {
            ...(searchTerm?.toString() && {
                title: {
                    contains: searchTerm.toString(),
                    mode: 'insensitive'
                },
            }),
            ...(myEvents && {
                createdBy: userId
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