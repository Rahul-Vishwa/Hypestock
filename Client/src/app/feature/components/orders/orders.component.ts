import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderService } from '../../services/order.service';
import { OrderDetails, Pagination } from '../../../shared/interface/interface';
import { DatePipe, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-orders',
  imports: [
    DatePipe,
    TitleCasePipe
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  orders = signal<OrderDetails[]>([]);
  totalRows = signal<number>(0);
  pagination = signal<Pagination>({
    page: 1,
    pageSize: 10,
    searchTerm: null
  });
  
  constructor(
    private order: OrderService
  ) {}
  
  ngOnInit(): void {
    this.getOrders();
  }

  private getOrders() {
    this.subscription.add(
      this.order.getOrders(
        this.pagination()
      )
      .subscribe(({ orders, totalRows }) => {
        this.orders.set(orders);
        this.totalRows.set(totalRows);
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
    this.getOrders();
  }

  onPageIncrease() {
    if (this.pagination().page < this.totalPages()){
      this.pagination.update(prev => ({ ...prev, page: prev.page + 1 }));
    }
    this.getOrders();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
