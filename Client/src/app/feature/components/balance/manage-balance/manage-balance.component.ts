import { NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { BalanceService } from '../../../services/balance.service';
// @ts-ignore
import { load } from "@cashfreepayments/cashfree-js";
import { PaymentHistoryComponent } from "../../payment-history/payment-history.component";
import { Balance, Pagination } from '../../../../shared/interface/interface';


@Component({
  selector: 'app-manage-balance',
  imports: [
    NgClass,
    ReactiveFormsModule,
    PaymentHistoryComponent
],
  templateUrl: './manage-balance.component.html',
  styleUrl: './manage-balance.component.css'
})
export class ManageBalanceComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  balance = signal<Balance>({
    balance: 0,
    lockedBalance: 0
  });
  input = new FormControl(null, [ Validators.required, Validators.max(999999) ]);
  cashfree = signal<any>(null);
  private $refreshPaymentHistory = new Subject<void>();
  refresh = this.$refreshPaymentHistory.asObservable();

  constructor(
    private balanceService: BalanceService
  ) {}

  async ngOnInit(): Promise<void> {
    this.subscription.add(
      this.balanceService.getBalance()
        .subscribe(({ balance, lockedBalance }) => {
          this.balance.set({
            balance,
            lockedBalance
          });
        })
    );  
    this.cashfree.set(
      await load({
        mode: "sandbox",
      })
    );
  }

  addBalance() {
    this.subscription.add(
      this.balanceService.createOrder(this.input.value!)
        .subscribe(({ payment_session_id, paymentId }) => {
          let checkoutOptions = {
            paymentSessionId: payment_session_id,
            redirectTarget: "_modal",
          };
          this.cashfree().checkout(checkoutOptions).then(async (result: any) => {
            if (result.error) {
              console.log("User has closed the popup or there is some payment error, Check for Payment Status");
              console.log(result.error);
            }
            if (result.redirect) {
              console.log("Payment will be redirected");
            }
            if (result.paymentDetails) {
              console.log(result);
              this.subscription.add(
                this.balanceService.updateBalance(
                  this.input.value!,
                  paymentId
                )
                .subscribe(({ balance, lockedBalance }) => {
                  this.balance.set({
                    balance,
                    lockedBalance
                  });
                  this.input.reset();
                  this.$refreshPaymentHistory.next();
                })
              );
            }
          });
        })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
