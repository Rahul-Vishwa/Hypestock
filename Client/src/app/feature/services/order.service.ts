import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataPoint, Holding, Order, OrderDetails, Pagination } from '../../shared/interface/interface';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  constructor(private http: HttpClient) { }

  placeIpoOrder(data: Order): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('order/ipo', data);
  }

  placeOrder(data: Order): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('order', data);
  }

  getLivePricePoints(eventId: string): Observable<{ prices: DataPoint[] }> {
    return this.http.get<{ prices: DataPoint[] }>('order/prices', {
      params: {
        eventId
      }
    });
  }

  getPricePoints(eventId: string): Observable<{ pricePoints: DataPoint[] }> {
    return this.http.get<{ pricePoints: DataPoint[] }>('order/pricePoints', {
      params: {
        eventId
      }
    });
  }

  getOrders(pagination: Pagination): Observable<{ orders: OrderDetails[], totalRows: number }> {
    let params = new HttpParams({
      fromObject: {
        page: pagination.page,
        pageSize: pagination.pageSize,
      }
    });
    if (pagination.searchTerm) {
      params = params.set('searchTerm', pagination.searchTerm);
    }
    return this.http.get<{ orders: OrderDetails[], totalRows: number }>('order/all', {
      params
    });
  }

  getHoldings(): Observable<{ holdings: Holding[] }> {
    return this.http.get<{ holdings: Holding[] }>('order/holdings');
  }
  
  getExpiredHoldings(): Observable<{ holdings: Holding[] }> {
    return this.http.get<{ holdings: Holding[] }>('order/expiredHoldings');
  }
}
