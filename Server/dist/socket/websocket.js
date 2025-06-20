"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
exports.default = Socket;
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
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
        console.log('Client connected', socket.id);
        socket.on('joinEvent', eventId => {
            console.log('Event Joined, Event id: ', eventId);
            socket.join(eventId);
        });
        socket.on('leaveMatch', eventId => {
            console.log('Event left, Event id: ', eventId);
            socket.leave(eventId);
        });
        socket.on('disconnect', (reason) => {
            console.log('Client disconnected', socket.id, 'Reason:', reason);
        });
    });
    server.listen(3000, () => {
        console.log(`Listening on port ${3000}`);
    });
}
