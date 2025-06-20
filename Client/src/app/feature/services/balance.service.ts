import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BalanceService {

  constructor(private http: HttpClient) { }

  getBalance(): Observable<{ balance: number }> {
    return this.http.get<{ balance: number }>('balance');
  }

  createOrder(amount: number): Observable<{ payment_session_id: string, paymentId: string }> {
    return this.http.post<{ payment_session_id: string, paymentId: string }>('balance/createOrder', {
      amount
    })
  }

  updateBalance(amount: number, paymentId: string): Observable<{ balance: number }> {
    return this.http.post<{ balance: number }>('balance', {
      amount,
      paymentId
    });
  }
}
