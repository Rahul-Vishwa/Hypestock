import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Holding } from '../../../shared/interface/interface';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-holdings',
  imports: [],
  templateUrl: './holdings.component.html',
  styleUrl: './holdings.component.css'
})
export class HoldingsComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  holdings = signal<Holding[]>([]);
  type = signal<'active' | 'expired'>('active');
  
  constructor(
    private order: OrderService
  ) {}
  
  ngOnInit(): void {
    this.getHoldings();
  }

  private getHoldings() {
    this.subscription.add(
      this.order.getHoldings()
      .subscribe(({ holdings }) => {
        this.holdings.set(holdings);
      })
    );
  }

  private getExpiredHoldings() {
    this.subscription.add(
      this.order.getExpiredHoldings() 
        .subscribe(({ holdings }) => {
          this.holdings.set(holdings);
        })
    );
  }

  onTypeChange(type: 'active' | 'expired') {
    this.type.set(type);
    if (type === 'expired') {
      this.getExpiredHoldings();
      return;
    }
    this.getHoldings();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
