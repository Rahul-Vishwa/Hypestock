"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.eventRouter = exports.EventPatchSchema = exports.EventSchema = exports.Filters = exports.Status = void 0;
exports.updateStatus = updateStatus;
const express_1 = require("express");
const db_1 = require("../db/db");
const zod_1 = require("zod");
const common_1 = __importStar(require("../common/common"));
const cronJob_1 = require("../lib/cronJob");
const redis_1 = require("../redis/redis");
const router = (0, express_1.Router)();
var Status;
(function (Status) {
    Status["upcoming"] = "Upcoming";
    Status["ipoPhase"] = "IPO Phase";
    Status["started"] = "Started";
    Status["ended"] = "Ended";
})(Status || (exports.Status = Status = {}));
;
var Filters;
(function (Filters) {
    Filters["upcoming"] = "Upcoming";
    Filters["ipoPhase"] = "IPO Phase";
    Filters["started"] = "Started";
    Filters["ended"] = "Ended";
})(Filters || (exports.Filters = Filters = {}));
exports.EventSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    category: zod_1.z.string(),
    date: zod_1.z.string(),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
    ipo: zod_1.z.string(),
});
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const data = exports.EventSchema.parse(req.body);
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        if (!userId) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        yield db_1.prismaClient.event.create({
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
        yield Promise.all([
            (0, redis_1.deleteCacheGroup)('events:keys'),
            (0, redis_1.deleteCacheGroup)('eventTotalRows:keys'),
            (0, redis_1.deleteCacheGroup)(`events:keys:userId:${userId}`),
            (0, redis_1.deleteCacheGroup)(`eventTotalRows:keys:userId:${userId}`),
        ]);
        res.json({ message: 'Event created successfully' });
    }
    catch (error) {
        console.error('event.ts POST');
        console.error(error);
        res.status(500).json({ message: 'Error saving event' });
    }
}));
exports.EventPatchSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    category: zod_1.z.string(),
    date: zod_1.z.string(),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
    ipo: zod_1.z.string(),
});
router.patch('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const event = exports.EventPatchSchema.parse(req.body);
        const filter = {
            where: {
                id: event.id
            }
        };
        const prevData = yield db_1.prismaClient.event.findUnique(filter);
        if (!prevData) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        const ipoStartTime = (0, common_1.default)(prevData.startTime);
        ipoStartTime.setMinutes(ipoStartTime.getMinutes() - 20);
        const prevDate = new Date(prevData.date);
        const now = new Date();
        const isPastDate = prevDate < now;
        const isToday = (0, common_1.compareDates)(prevDate, now, 'equal');
        const isIPOStartedOrClose = isToday && now >= ipoStartTime;
        if (isPastDate || isIPOStartedOrClose) {
            res.json({ message: "Can't edit event" });
            return;
        }
        if ((prevData === null || prevData === void 0 ? void 0 : prevData.date) !== event.date) {
            (_a = cronJob_1.timeout.get(event.id)) === null || _a === void 0 ? void 0 : _a.close();
        }
        else if ((prevData === null || prevData === void 0 ? void 0 : prevData.startTime) !== event.startTime ||
            (prevData === null || prevData === void 0 ? void 0 : prevData.endTime) !== event.endTime) {
            (_b = cronJob_1.timeout.get(event.id)) === null || _b === void 0 ? void 0 : _b.close();
            (0, cronJob_1.setIpoTimeout)(event.id, event.startTime, event.endTime);
        }
        yield db_1.prismaClient.event.update(Object.assign(Object.assign({}, filter), { data: {
                title: event.title,
                description: event.description,
                category: event.category,
                date: event.date,
                startTime: event.startTime,
                endTime: event.endTime,
                ipo: parseInt(event.ipo)
            } }));
        res.json({ message: 'Event updated successfully' });
    }
    catch (e) {
        console.error('event.ts PATCH /');
        console.error(e);
        res.status(500).json({ message: 'Some error fetching data' });
    }
}));
// Maybe change status at later stage
router.delete('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.query;
        const filter = {
            where: {
                id: eventId === null || eventId === void 0 ? void 0 : eventId.toString()
            }
        };
        const event = yield db_1.prismaClient.event.findUnique(filter);
        if (!event) {
            res.status(404).json({ message: 'Event Not Found' });
            return;
        }
        yield db_1.prismaClient.event.delete(filter);
        res.json({ message: 'Event deleted successfully' });
    }
    catch (error) {
        console.error('event.ts /delete');
        console.error(error);
        res.status(500).json({ message: 'Some error deleting event' });
    }
}));
function getEvents(filters, page, pageSize) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield db_1.prismaClient.event.findMany({
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
    });
}
function getEventTotalRows(filters) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield db_1.prismaClient.event.count({
            where: filters
        });
    });
}
router.get('/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = parseInt(req.query.page);
        const pageSize = parseInt(req.query.pageSize);
        const searchTerm = req.query.searchTerm;
        const filter = req.query.filter;
        const myEvents = req.query.myEvents;
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        const showMyEvents = myEvents === 'true' ? true : false;
        if (!userId) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const filters = Object.assign(Object.assign(Object.assign({}, (searchTerm && {
            title: {
                contains: searchTerm,
                mode: 'insensitive'
            },
        })), (showMyEvents && {
            createdBy: userId
        })), (filter && {
            status: filter
        }));
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
            [events, totalRows] = yield Promise.all([
                (0, redis_1.cache)(cacheKey, () => __awaiter(void 0, void 0, void 0, function* () { return yield getEvents(filters, page, pageSize); })),
                (0, redis_1.cache)(cacheKeyTotalRows, () => __awaiter(void 0, void 0, void 0, function* () { return yield getEventTotalRows(filters); }))
            ]);
            yield Promise.all([
                (0, redis_1.addCacheGroup)(setCacheKey, cacheKey),
                (0, redis_1.addCacheGroup)(setCacheKeyTotalRows, cacheKeyTotalRows)
            ]);
        }
        else {
            [events, totalRows] = yield Promise.all([
                getEvents(filters, page, pageSize),
                getEventTotalRows(filters)
            ]);
        }
        res.json({ events, totalRows });
    }
    catch (e) {
        console.error('event.ts GET /all');
        console.error(e);
        res.status(500).json({ message: 'Some error fetching data' });
    }
}));
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.query;
        const event = yield db_1.prismaClient.event.findUnique({
            where: {
                id: id === null || id === void 0 ? void 0 : id.toString()
            }
        });
        res.json({ event });
    }
    catch (error) {
        console.error('event.ts GET /');
        console.error(error);
        res.status(500).json({ message: 'Some error fetching data' });
    }
}));
// TODO: Change this to use Sets
router.get('/canEdit', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.query;
        const event = yield db_1.prismaClient.event.findUnique({
            where: {
                id: eventId === null || eventId === void 0 ? void 0 : eventId.toString(),
            }
        });
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        const startTime = (0, common_1.default)(event.startTime);
        startTime.setMinutes(startTime.getMinutes() - 20);
        const eventDate = new Date(event.date);
        const now = new Date();
        const isPastDate = eventDate < now;
        const isToday = (0, common_1.compareDates)(eventDate, now, 'equal');
        const isIPOStartedOrClose = isToday && now >= startTime;
        if (isPastDate || isIPOStartedOrClose) {
            res.json({ canEdit: false });
            return;
        }
        res.json({ canEdit: true });
    }
    catch (error) {
        console.error('event.ts /canEdit');
        console.error(error);
        res.status(500).json({ message: 'Some error fetching data' });
    }
}));
function updateStatus(id, status) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield db_1.prismaClient.event.update({
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
    });
}
exports.eventRouter = router;
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
