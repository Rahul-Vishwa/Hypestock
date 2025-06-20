import { Server } from 'socket.io';
import { Express } from 'express';
import http from 'http';
import { sendOrderBook } from '../routes/order';

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

export { io };