import { Component, input, OnChanges, OnDestroy, OnInit, signal, SimpleChanges } from '@angular/core';
import type { Time } from 'lightweight-charts';
import { ChartComponent } from "../../../../shared/components/chart/chart.component";
import { OrderService } from '../../../services/order.service';
import { SocketService } from '../../../../core/services/socket.service';
import { Subscription } from 'rxjs';

interface DataPoint {
  time: Time;
  value: number;
}

@Component({
  selector: 'app-live-chart',
  imports: [ChartComponent],
  templateUrl: './live-chart.component.html',
  styleUrl: './live-chart.component.css'
})
export class LiveChartComponent implements OnInit, OnChanges, OnDestroy {
  private subscription = new Subscription();
  eventId = input.required<string>();
  data = signal<DataPoint[]>([]);

  constructor(
    private order: OrderService,
    private socket: SocketService
  ) {}

  ngOnInit(): void {
    this.socket.onPriceChange((data: DataPoint) => {
      if (!this.data().some(item => item.time === data.time)) {
        this.data.update(prev => [...prev, data]);
      }
    })
  }

  ngOnChanges(): void {
    this.subscription.add(
      this.order.getPrices(this.eventId())
      .subscribe(({ prices }) => {
        this.data.set(prices);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
