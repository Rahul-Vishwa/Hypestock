import { TitleCasePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import convertTo12hFormat from '../../../../shared/utility/time';
import { EventService } from '../../../services/event.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Event, Status } from '../../../../shared/interface/interface';
import { PlaceOrderComponent } from "../place-order/place-order.component";
import { OrderBookComponent } from "../order-book/order-book.component";
import { LiveChartComponent } from "../live-chart/live-chart.component";
import { Subscription } from 'rxjs';
import { SocketService } from '../../../../core/services/socket.service';

@Component({
  selector: 'app-trade',
  imports: [
    TitleCasePipe,
    PlaceOrderComponent,
    OrderBookComponent,
    LiveChartComponent
],
  templateUrl: './trade.component.html',
  styleUrl: './trade.component.css'
})
export class TradeComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  event = signal<Event | null>(null);
  status = signal<string | null>(null);

  constructor(
    private eventService: EventService,
    private route: ActivatedRoute,
    private router: Router,
    private socket: SocketService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params && params.get('id')) {
        this.eventService.getEvent(
          params.get('id')!
        )
        .subscribe(({ event }) => {
          this.event.set(event);
        });
        this.socket.connect(params.get('id')!);
      }
      else {
        this.router.navigate(['notFound']);
      }
    });

    this.socket.onIpoStart(() => {
      this.status.set(Status.ipoPhase);
    });
    this.socket.onEventStart(() => {
      this.status.set(Status.started);
    });
    this.socket.onEventEnd(() => {
      this.status.set(Status.ended);
    });
  }

  convertTo12hFormat(time: string) {
    return convertTo12hFormat(time);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.socket.disconnect();
  }
}
