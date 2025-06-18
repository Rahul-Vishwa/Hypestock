import io from "socket.io-client";

let socket: SocketIOClient.Socket;

export function connect(eventId: string) {
    const apiUrl = import.meta.env.VITE_API_URL;
    socket = io(apiUrl);
    socket.emit('joinEvent', eventId);
}

export function disconnect() {
    socket.disconnect();
} 

export function isConnected() { 
    return socket ? socket.connected : false;
}

export function onEventStart(callback: Function) {
    socket.on('eventStarted', callback);
}

export function onEventEnd(callback: Function) {
    socket.on('eventEnded', callback);
}

export function onOrderBook(callback: Function) {
    socket.on('orderBook', callback);
}

export function onPriceChange(callback: Function) {
    socket.on('priceChanged', callback);
}