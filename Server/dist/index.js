"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_1 = require("./routes/user");
const dotenv_1 = __importDefault(require("dotenv"));
const websocket_1 = __importDefault(require("./socket/websocket"));
const cronJob_1 = require("./lib/cronJob");
const auth_1 = require("./middlewares/auth");
const event_1 = require("./routes/event");
const order_1 = require("./routes/order");
const balance_1 = require("./routes/balance");
const redis_1 = require("./redis/redis");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Uncomment for production
// app.use(cors({
//   origin: 'https://dev.hypestock.local',
//   credentials: true
// }));
app.use(express_1.default.json());
app.use(auth_1.jwtCheck);
app.use('/user', user_1.userRouter);
app.use('/event', event_1.eventRouter);
app.use('/order', order_1.orderRouter);
app.use('/balance', balance_1.balanceRouter);
(0, cronJob_1.registerCronJobs)();
(0, redis_1.connect)();
(0, websocket_1.default)(app);
