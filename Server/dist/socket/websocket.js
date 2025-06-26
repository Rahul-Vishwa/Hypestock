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
exports.io = void 0;
exports.default = Socket;
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const cronJob_1 = require("../lib/cronJob");
const order_1 = require("../routes/order");
let io;
function Socket(app) {
    const server = http_1.default.createServer(app);
    exports.io = io = new socket_io_1.Server(server
    // uncomment in production
    // ,{
    //     cors: {
    //         origin: 'https://dev.hypestock.local'
    //     }
    // }
    );
    io.on('connection', (socket) => {
        socket.on('joinEvent', (eventId) => __awaiter(this, void 0, void 0, function* () {
            socket.join(eventId);
            emitEventStatus(eventId);
        }));
        socket.on('statusRequest', eventId => {
            emitEventStatus(eventId);
        });
        socket.on('orderBookRequest', eventId => {
            (0, order_1.sendOrderBook)(eventId);
        });
        socket.on('priceRequest', eventId => {
            io.send('orderBook', order_1.price.get(eventId) || []);
        });
        socket.on('leaveMatch', eventId => {
            socket.leave(eventId);
        });
        socket.on('disconnect', (reason) => {
        });
    });
    server.listen(3000, () => {
        console.log(`Listening on port ${3000}`);
    });
}
function emitEventStatus(eventId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (cronJob_1.runningIPOs.has(eventId)) {
            io.emit('ipoStarted');
        }
        if (cronJob_1.runningEvents.has(eventId)) {
            io.emit('eventStarted');
        }
    });
}
