import express from 'express';
import cors from 'cors';
import { userRouter } from './routes/user';
import dotenv from 'dotenv';
import webSocket from './socket/websocket';
import { registerCronJobs } from './lib/cronJob';
import { jwtCheck } from './middlewares/auth';
import { eventRouter } from './routes/event';
import { orderRouter } from './routes/order';
import { balanceRouter } from './routes/balance';

dotenv.config();
const app = express();

// Uncomment for production
// app.use(cors({
//   origin: 'https://dev.hypestock.local',
//   credentials: true
// }));
app.use(express.json());

app.use(jwtCheck);

app.use('/user', userRouter);
app.use('/event', eventRouter);
app.use('/order', orderRouter);
app.use('/balance', balanceRouter);

registerCronJobs();

webSocket(app);