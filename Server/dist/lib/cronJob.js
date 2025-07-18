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
exports.ipoMins = exports.runningEvents = exports.runningIPOs = exports.timeout = void 0;
exports.registerCronJobs = registerCronJobs;
exports.startTimeouts = startTimeouts;
exports.setIpoTimeout = setIpoTimeout;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../db/db");
const websocket_1 = require("../socket/websocket");
const order_1 = require("../routes/order");
const common_1 = __importDefault(require("../common/common"));
const event_1 = require("../routes/event");
function registerCronJobs() {
    todaysEvents();
}
function todaysEvents() {
    return __awaiter(this, void 0, void 0, function* () {
        startTimeouts();
        // Change this to daily at 12am
        node_cron_1.default.schedule('*/1 * * * *', () => {
            startTimeouts();
        });
    });
}
function startTimeouts() {
    return __awaiter(this, void 0, void 0, function* () {
        // uncomment this on 24hrs cron job
        // timeout.clear();
        const events = yield db_1.prismaClient.event.findMany({
            where: {
                date: new Date().toISOString().split('T')[0],
            }
        });
        for (let event of events) {
            setIpoTimeout(event.id, event.startTime, event.endTime);
        }
    });
}
exports.timeout = new Map();
exports.runningIPOs = new Set();
exports.runningEvents = new Set();
exports.ipoMins = 1;
function setIpoTimeout(id, startTime, endTime) {
    let timeDifference = getTimeDifference(startTime) - exports.ipoMins * 60 * 1000;
    if (timeDifference > 0) {
        const timeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            websocket_1.io.emit('ipoStarted');
            exports.runningIPOs.add(id);
            order_1.price.set(id, []);
            yield (0, event_1.updateStatus)(id, event_1.Status.ipoPhase);
            setStartTimeTimeout(id, startTime, endTime);
        }), timeDifference);
        exports.timeout.set(id, timeoutId);
    }
}
function setStartTimeTimeout(id, startTime, endTime) {
    const timeDifference = getTimeDifference(startTime);
    if (timeDifference > 0) {
        const timeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            websocket_1.io.emit('eventStarted');
            exports.runningIPOs.delete(id);
            exports.runningEvents.add(id);
            order_1.bids.set(id, []);
            order_1.asks.set(id, []);
            yield (0, event_1.updateStatus)(id, event_1.Status.started);
            setEndTimeTimeout(id, endTime);
        }), timeDifference);
        exports.timeout.set(id, timeoutId);
    }
}
function setEndTimeTimeout(id, endTime) {
    const timeDifference = getTimeDifference(endTime);
    if (timeDifference > 0) {
        const timeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            websocket_1.io.emit('eventEnded');
            exports.runningEvents.delete(id);
            yield updateDB(id);
            order_1.bids.delete(id);
            order_1.asks.delete(id);
            (0, order_1.sendOrderBook)(id);
            exports.timeout.delete(id);
        }), timeDifference);
        exports.timeout.set(id, timeoutId);
    }
}
function getTimeDifference(time24hr) {
    const endTime = (0, common_1.default)(time24hr);
    return endTime.getTime() - Date.now();
}
function updateDB(id) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, order_1.savePricePoints)(id);
        yield (0, event_1.updateStatus)(id, event_1.Status.ended);
        yield (0, order_1.unlockBalanceForEvent)(id);
        yield (0, order_1.saveHoldings)(id);
    });
}
