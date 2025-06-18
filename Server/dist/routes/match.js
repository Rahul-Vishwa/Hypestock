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
exports.matchRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db/db");
const router = (0, express_1.Router)();
router.get('/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const matches = yield db_1.prismaClient.match.findMany({
            orderBy: {
                dateTimeGMT: 'asc'
            }
        });
        return res.json({ matches });
    }
    catch (e) {
        console.error('match.ts GET /all');
        console.error(e);
        return res.status(500).json({ message: 'Some error fetching data' });
    }
}));
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.query;
        const match = yield db_1.prismaClient.match.findUnique({
            where: {
                id: id
            }
        });
        return res.json({ match });
    }
    catch (e) {
        console.error('match.ts GET /');
        console.error(e);
        return res.status(500).json({ message: 'Some error fetching data' });
    }
}));
exports.matchRouter = router;
