import { Component, input, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../../../../core/services/socket.service';
import { OrderBook, OrderBookArr } from '../../../../shared/interface/interface';

@Component({
  selector: 'app-order-book',
  imports: [],
  templateUrl: './order-book.component.html',
  styleUrl: './order-book.component.css'
})
export class OrderBookComponent implements OnInit, OnDestroy {
  eventId = input.required<string>();
  private subscription = new Subscription();
  orderBook = signal<OrderBookArr | null>(null);

  constructor(
    private socket: SocketService
  ) {}

  ngOnInit(): void {
    this.socket.emitOrderBookRequest(this.eventId());

    this.socket.onOrderBook((orderBook: OrderBook) => {
      const orderBookArr = Array.from(Object.entries(orderBook));
      this.orderBook.set(orderBookArr);
    });
    
    this.socket.onEventEnd(() => {
      this.orderBook.set([]);
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
