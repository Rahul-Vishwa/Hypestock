import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataPoint } from '../../shared/interface/interface';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  constructor(private http: HttpClient) { }

  placeOrder(
    eventId: string, 
    price: number, 
    quantity: number, 
    side: 'bid' | 'ask'
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('order', {
      eventId,
      price,
      quantity,
      side
    });
  }

  getPrices(eventId: string): Observable<{ prices: DataPoint[] }> {
    return this.http.get<{ prices: DataPoint[] }>('order/prices', {
      params: {
        eventId
      }
    });
  }
}
