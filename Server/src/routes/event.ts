import { Request, Response, Router } from "express";
import { prismaClient } from "../db/db";
import { z } from "zod";
import getDate, { compareDates } from "../common/common";
import { setIpoTimeout, timeout } from "../lib/cronJob";
import { addCacheGroup, cache, deleteCacheGroup } from "../redis/redis";

const router = Router();

export enum Status {
    upcoming = 'Upcoming',
    ipoPhase = 'IPO Phase',
    started = 'Started',
    ended = 'Ended',
};

export enum Filters {
    upcoming = 'Upcoming',
    ipoPhase = 'IPO Phase',
    started = 'Started',
    ended = 'Ended',
}

export const EventSchema = z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    ipo: z.string(),
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const data = EventSchema.parse(req.body);
        const userId = req.auth?.payload.sub;

        if (!userId) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        
        await prismaClient.event.create({
            data: {
                title: data.title,
                description: data.description,
                category: data.category,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                ipo: parseInt(data.ipo),
                createdBy: userId,
            }
        });

        await Promise.all([
            deleteCacheGroup('events:keys'),
            deleteCacheGroup('eventTotalRows:keys'),
            deleteCacheGroup(`events:keys:userId:${userId}`),
            deleteCacheGroup(`eventTotalRows:keys:userId:${userId}`),
        ]);

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
    ipo: z.string(),
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

        if (!prevData) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        const ipoStartTime = getDate(prevData.startTime);
        ipoStartTime.setMinutes(ipoStartTime.getMinutes() - 20);
        const prevDate = new Date(prevData.date);
        const now = new Date();

        const isPastDate = prevDate < now;
        const isToday = compareDates(prevDate, now, 'equal');
        const isIPOStartedOrClose = isToday && now >= ipoStartTime;

        if (isPastDate || isIPOStartedOrClose) {
            res.json({ message: "Can't edit event" });
            return;
        }

        if (prevData?.date !== event.date) {
            timeout.get(event.id)?.close();
        }
        else if (
            prevData?.startTime !== event.startTime ||
            prevData?.endTime !== event.endTime
        ) {
            timeout.get(event.id)?.close();
            setIpoTimeout(event.id, event.startTime, event.endTime);
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
                ipo: parseInt(event.ipo)
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


// Maybe change status at later stage
router.delete('/', async (req: Request, res: Response) => {
    try {
        const { eventId } = req.query;
        
        const filter = {
            where: {
                id: eventId?.toString()
            }
        };

        const event = await prismaClient.event.findUnique(filter);

        if (!event) {
            res.status(404).json({ message: 'Event Not Found' });
            return;
        }
        await prismaClient.event.delete(filter);

        res.json({ message: 'Event deleted successfully' });
    }
    catch (error) {
        console.error('event.ts /delete');
        console.error(error);
        res.status(500).json({ message: 'Some error deleting event' });
    }
});

async function getEvents(filters: any, page: number, pageSize: number) {
    return await prismaClient.event.findMany({
        where: filters,
        select: {
            id: true,
            title: true,
            description: true,
            category: true,
            date: true,
            startTime: true,
            endTime: true,
            ipo: true,
            status: true
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: pageSize,
        skip: (page - 1) * pageSize
    });
}

async function getEventTotalRows(filters: any) {
    return await prismaClient.event.count({
        where: filters
    });
}


router.get('/all', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string);
        const pageSize = parseInt(req.query.pageSize as string);
        const searchTerm = req.query.searchTerm as string | undefined;
        const filter = req.query.filter as Filters;
        const myEvents = req.query.myEvents as string;
        const userId = req.auth?.payload.sub;

        const showMyEvents = myEvents === 'true' ? true: false;

        if (!userId) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const filters: any = {
            ...(searchTerm && {
                title: {
                    contains: searchTerm,
                    mode: 'insensitive'
                },
            }),
            ...(showMyEvents && {
                createdBy: userId
            }),
            ...(filter && {
                status: filter
            })
        };

        let events, totalRows;
        if (!searchTerm) {
            let cacheKey;
            let cacheKeyTotalRows;
            let setCacheKey;
            let setCacheKeyTotalRows;
            if (myEvents) {
                cacheKey = `events:userId=${userId}:filter=${filter}:page=${page}:pageSize=${pageSize}`;
                cacheKeyTotalRows = `eventTotalRows:userId=${userId}:filter=${filter}`;

                setCacheKey = `events:keys:userId:${userId}`;
                setCacheKeyTotalRows = `eventTotalRows:keys:userId:${userId}`;
            }
            else {
                cacheKey = `events:filter=${filter}:page=${page}:pageSize=${pageSize}`;
                cacheKeyTotalRows = `eventTotalRows:filter=${filter}`;

                setCacheKey = `events:keys`;
                setCacheKeyTotalRows = `eventTotalRows:keys`;
            }

            [events, totalRows] = await Promise.all([
                cache(cacheKey, async () => await getEvents(filters, page, pageSize)),
                cache(cacheKeyTotalRows, async () => await getEventTotalRows(filters))
            ]);
            
            await Promise.all([
                addCacheGroup(setCacheKey, cacheKey),
                addCacheGroup(setCacheKeyTotalRows, cacheKeyTotalRows)
            ]);
        }   
        else {
            [events, totalRows] = await Promise.all([
                getEvents(filters, page, pageSize),
                getEventTotalRows(filters)
            ]); 
        }
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

// TODO: Change this to use Sets
router.get('/canEdit', async (req: Request, res: Response) => {
    try {
        const { eventId } = req.query;
        const event = await prismaClient.event.findUnique({
            where: {
                id: eventId?.toString(),
            }
        });
        
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        const startTime = getDate(event.startTime);
        startTime.setMinutes(startTime.getMinutes() - 20);
        const eventDate = new Date(event.date);
        const now = new Date();

        const isPastDate = eventDate < now; 
        const isToday = compareDates(eventDate, now, 'equal');
        const isIPOStartedOrClose = isToday && now >= startTime;
        
        if (isPastDate || isIPOStartedOrClose) {
            res.json({ canEdit: false });
            return;
        }

        res.json({ canEdit: true });
    }
    catch(error) {
        console.error('event.ts /canEdit');
        console.error(error);
        res.status(500).json({ message: 'Some error fetching data' });
    }
});

export async function updateStatus(id: string, status: string) {
    try {
        await prismaClient.event.update({
            where: {
                id
            },
            data: {
                status
            }
        });
    }
    catch (error) {
        console.error('event.ts /updateStatus');
        console.error(error);
    }
}

export const eventRouter = router;


// You can change this and use when the server goes down and restarts
// Not in scope for now

// export async function isIpoRunning(eventId: string): Promise<boolean | undefined> {
//     const event = await prismaClient.event.findUnique({
//         where: {
//             id: eventId,
//         }
//     });
    
//     if (!event) {
//         return;
//     }

//     const date = new Date(event.date);
//     const startTime = getDate(event.startTime);
//     const ipoTime = new Date();
//     ipoTime.setMinutes(ipoTime.getMinutes() - 15);
//     const now = new Date();

//     if (compareDate(date, now, 'equal')) {
//         if (ipoTime <= now && now < startTime){
//             return true;
//         }
//     }
//     return false;
// }

// export async function isEventRunning(eventId: string): Promise<boolean | undefined> {
//     const event = await prismaClient.event.findUnique({
//         where: {
//             id: eventId,
//         }
//     });
    
//     if (!event) {
//         return;
//     }

//     const date = new Date(event.date);
//     const startTime = getDate(event.startTime);
//     const endTime = getDate(event.endTime);
//     const now = new Date();

//     if (compareDate(date, now, 'equal')) {
//         if (startTime <= now && now < endTime){
//             return true;
//         }
//         else {
//             if (now < startTime) {
//                 return;
//             }
//             return false; 
//         }
//     }
//     if (now < date) {
//         return;
//     }
//     return false;
// }