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
exports.userRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db/db");
const router = (0, express_1.Router)();
const UserSchema = zod_1.z.object({
    email: zod_1.z.string(),
    nickName: zod_1.z.string(),
    name: zod_1.z.string()
});
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { email, nickName, name } = UserSchema.parse(req.body);
        const userId = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub;
        const user = yield db_1.prismaClient.user.findFirst({
            where: {
                id: userId
            }
        });
        if (user) {
            res.json({ message: 'User already exists' });
            return;
        }
        yield db_1.prismaClient.user.create({
            data: {
                id: userId,
                email,
                nickName,
                name
            }
        });
        res.json({ message: 'User created successfully' });
    }
    catch (e) {
        console.error('user.ts POST');
        console.error(e);
        res.status(500).json({ message: 'Some error saving data' });
    }
}));
exports.userRouter = router;
