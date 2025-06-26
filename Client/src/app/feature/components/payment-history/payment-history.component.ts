import { Component, input, OnInit, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { BalanceService } from '../../services/balance.service';
import { Pagination, Payment } from '../../../shared/interface/interface';
import { DatePipe, NgClass, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-payment-history',
  imports: [
    TitleCasePipe,
    DatePipe
  ],
  templateUrl: './payment-history.component.html',
  styleUrl: './payment-history.component.css'
})
export class PaymentHistoryComponent implements OnInit{
  refresh = input<Observable<void>>();
  private subscription = new Subscription();
  payments = signal<Payment[]>([]);
  totalRows = signal<number>(0);
  pagination = signal<Pagination>({
    page: 1,
    pageSize: 10,
    searchTerm: null
  });

  constructor(
    private balance: BalanceService,
  ) {}

  ngOnInit(): void {
    this.getPaymentHistory();
    this.refresh()?.subscribe(() => {
      this.getPaymentHistory();
    });
  }

  private getPaymentHistory() {
    this.subscription.add(
      this.balance.getPaymentHistory(
        this.pagination()
      )
      .subscribe(data => {
        console.log(data);
        this.payments.set(data.payments);
        this.totalRows.set(data.totalRows);
      })
    );
  }

  totalPages() {
    return Math.ceil(this.totalRows() / this.pagination().pageSize);
  }

  onPageDecrease() {
    if (this.pagination().page > 1){
      this.pagination.update(prev => ({ ...prev, page: prev.page - 1 }));
    }
    this.getPaymentHistory();
  }

  onPageIncrease() {
    if (this.pagination().page < this.totalPages()){
      this.pagination.update(prev => ({ ...prev, page: prev.page + 1 }));
    }
    this.getPaymentHistory();
  }
}
