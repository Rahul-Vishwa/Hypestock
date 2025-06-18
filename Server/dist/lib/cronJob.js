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
exports.registerCronJobs = registerCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../db/db");
const websocket_1 = require("../socket/websocket");
const order_1 = require("../routes/order");
const common_1 = __importDefault(require("../common/common"));
function registerCronJobs() {
    todaysEvents();
}
const timeout = new Map();
function todaysEvents() {
    return __awaiter(this, void 0, void 0, function* () {
        node_cron_1.default.schedule('*/1 * * * *', () => __awaiter(this, void 0, void 0, function* () {
            const events = yield db_1.prismaClient.event.findMany({
                where: {
                    date: new Date().toISOString().split('T')[0],
                    status: true
                }
            });
            for (let event of events) {
                const timeDifference = getTimeDifference(event.startTime);
                if (timeDifference > 0) {
                    const timeoutId = setTimeout(() => {
                        websocket_1.io.emit('eventStarted');
                        order_1.bids.set(event.id, []);
                        order_1.asks.set(event.id, []);
                        order_1.price.set(event.id, []);
                        setEndTimeTimeOut(event);
                    }, timeDifference);
                    timeout.set(event.id, timeoutId);
                }
            }
        }));
    });
}
function setEndTimeTimeOut(event) {
    const timeDifference = getTimeDifference(event.endTime);
    if (timeDifference > 0) {
        const timeoutId = setTimeout(() => {
            websocket_1.io.emit('eventEnded');
            order_1.bids.delete(event.id);
            order_1.asks.delete(event.id);
            order_1.price.delete(event.id);
            timeout.delete(event.id);
        }, timeDifference);
        timeout.set(event.id, timeoutId);
    }
}
function getTimeDifference(time24hr) {
    const endTime = (0, common_1.default)(time24hr);
    return endTime.getTime() - Date.now();
}
