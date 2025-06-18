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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRouter = exports.eventSchema = void 0;
const express_1 = require("express");
const db_1 = require("../db/db");
const zod_1 = require("zod");
const common_1 = __importDefault(require("../common/common"));
const order_1 = require("./order");
const router = (0, express_1.Router)();
exports.eventSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    category: zod_1.z.string(),
    date: zod_1.z.string(),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
});
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const data = exports.eventSchema.parse(req.body);
        yield db_1.prismaClient.event.create({
            data: {
                title: data.title,
                description: data.description,
                category: data.category,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                createdBy: (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub,
            }
        });
        res.json({ message: 'Event created successfully' });
    }
    catch (error) {
        console.error('event.ts POST');
        console.error(error);
        res.status(500).json({ message: 'Error saving event' });
    }
}));
router.get('/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page, pageSize, searchTerm } = req.query;
        const filters = Object.assign(Object.assign({}, ((searchTerm === null || searchTerm === void 0 ? void 0 : searchTerm.toString()) && {
            title: {
                contains: searchTerm.toString(),
                mode: 'insensitive'
            },
        })), { status: true });
        const totalRows = yield db_1.prismaClient.event.count({
            where: filters
        });
        const events = yield db_1.prismaClient.event.findMany({
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
router.get('/isRunning', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.query;
        const event = yield db_1.prismaClient.event.findUnique({
            where: {
                id: eventId === null || eventId === void 0 ? void 0 : eventId.toString(),
                date: new Date().toISOString().split('T')[0]
            }
        });
        if (!event) {
            res.json({ isRunning: false });
            return;
        }
        const startDate = (0, common_1.default)(event.startTime);
        const endDate = (0, common_1.default)(event.endTime);
        if (startDate <= new Date() && new Date() < endDate) {
            res.json({ isRunning: true });
            (0, order_1.sendOrderBook)(event.id);
            return;
        }
        res.json({ isRunning: false });
    }
    catch (error) {
        console.error('event.ts /isActive');
        console.error(error);
        res.status(500).json({ message: 'Some error fetching data' });
    }
}));
exports.eventRouter = router;
