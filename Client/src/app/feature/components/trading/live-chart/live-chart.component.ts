import { Component, input, numberAttribute, OnChanges, OnDestroy, OnInit, signal, SimpleChanges } from '@angular/core';
import type { Time } from 'lightweight-charts';
import { ChartComponent } from "../../../../shared/components/chart/chart.component";
import { OrderService } from '../../../services/order.service';
import { SocketService } from '../../../../core/services/socket.service';
import { map, Subscription } from 'rxjs';
import { DataPoint } from '../../../../shared/interface/interface';

@Component({
  selector: 'app-live-chart',
  imports: [ChartComponent],
  templateUrl: './live-chart.component.html',
  styleUrl: './live-chart.component.css'
})
export class LiveChartComponent implements OnInit, OnChanges, OnDestroy {
  private subscription = new Subscription();
  eventId = input.required<string>();
  status = input.required<string>();
  data = signal<DataPoint[]>([]);

  constructor(
    private order: OrderService,
    private socket: SocketService
  ) {}

  ngOnInit(): void {
    this.socket.emitPriceRequest(this.eventId());

    this.socket.onPriceChange((data: DataPoint) => {
      if (!this.data().some(item => item.time === data.time)) {
        this.data.update(prev => [...prev, data]);
      }
    });
  }

  ngOnChanges(): void {
    if (this.status() === 'Ended') {
      this.subscription.add(
        this.order.getPricePoints(this.eventId())
          .pipe(
            map(p => p.pricePoints.map(m => ({
              time: numberAttribute(m.time), 
              value: m.value 
            })))
          )
          .subscribe(pricePoints => {
            console.log(pricePoints);
            this.data.set(pricePoints as DataPoint[]);
          })
      );
    }
    else{
      this.subscription.add(
        this.order.getLivePricePoints(this.eventId())
        .subscribe(({ prices }) => {
          this.data.set(prices);
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
