import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Balance, Pagination, Payment } from '../../shared/interface/interface';

@Injectable({
  providedIn: 'root'
})
export class BalanceService {

  constructor(private http: HttpClient) { }

  getBalance(): Observable<Balance> {
    return this.http.get<Balance>('balance');
  }

  createOrder(amount: number): Observable<{ payment_session_id: string, paymentId: string }> {
    return this.http.post<{ payment_session_id: string, paymentId: string }>('balance/createOrder', {
      amount
    })
  }

  updateBalance(amount: number, paymentId: string): Observable<Balance> {
    return this.http.post<Balance>('balance', {
      amount,
      paymentId
    });
  }

  getPaymentHistory(pagination: Pagination): Observable<{ payments: Payment[], totalRows: number }> {
    let params = new HttpParams({
      fromObject: {
        page: pagination.page,
        pageSize: pagination.pageSize
      }
    });
    return this.http.get<{ payments: Payment[], totalRows: number }>('balance/allPayments', {
      params
    });
  }
}
