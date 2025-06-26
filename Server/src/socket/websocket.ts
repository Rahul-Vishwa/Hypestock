import { Server } from 'socket.io';
import { Express } from 'express';
import http from 'http';
import { runningEvents, runningIPOs } from '../lib/cronJob';
import { price, sendOrderBook } from '../routes/order';

let io: Server;

export default function Socket(app: Express) {
    const server = http.createServer(app);
    io = new Server(server
        // uncomment in production
        // ,{
        //     cors: {
        //         origin: 'https://dev.hypestock.local'
        //     }
        // }
    );
    
    io.on('connection', (socket) => {
        socket.on('joinEvent', async eventId => {
            socket.join(eventId);
            emitEventStatus(eventId);
        });
        socket.on('statusRequest', eventId => {
            emitEventStatus(eventId);
        });
        socket.on('orderBookRequest', eventId => {
            sendOrderBook(eventId);
        });
        socket.on('priceRequest', eventId => {
            io.send('orderBook', price.get(eventId) || []);
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

async function emitEventStatus(eventId: string) {
    if (runningIPOs.has(eventId)) {
        io.emit('ipoStarted');
    }
    if (runningEvents.has(eventId)) {
        io.emit('eventStarted');
    }
}

export { io };