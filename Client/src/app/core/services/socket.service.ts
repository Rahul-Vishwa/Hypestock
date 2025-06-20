import { Injectable, signal } from '@angular/core';
import io, { Socket } from "socket.io-client";
import { environment } from '../../environments/environment.development';
import { DataPoint, OrderBook } from '../../shared/interface/interface';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private apiUrl = environment.apiUrl;
  private socket = signal<Socket | null>(null); 

  constructor() { }

  connect(eventId: string) {
    this.socket.set(io(this.apiUrl));
    this.socket()?.emit('joinEvent', eventId);
  }

  disconnect() {
    this.socket()?.disconnect();
  } 

  isConnected() { 
    return this.socket() ? this.socket()?.connected : false;
  }

  onEventStart(callback: () => void) {
    this.socket()?.on('eventStarted', callback);
  }

  onEventEnd(callback: () => void) {
    this.socket()?.on('eventEnded', callback);
  }

  onOrderBook(callback: (orderBook: OrderBook) => void) {
    this.socket()?.on('orderBook', callback);
  }

  onPriceChange(callback: (data: DataPoint) => void) {
    this.socket()?.on('priceChanged', callback);
  }
}
