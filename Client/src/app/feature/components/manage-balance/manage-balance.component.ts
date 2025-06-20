import { NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BalanceService } from '../../services/balance.service';
// @ts-ignore
import { load } from "@cashfreepayments/cashfree-js";


@Component({
  selector: 'app-manage-balance',
  imports: [
    NgClass,
    ReactiveFormsModule
  ],
  templateUrl: './manage-balance.component.html',
  styleUrl: './manage-balance.component.css'
})
export class ManageBalanceComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  balance = signal<number>(0);
  input = new FormControl(null, [ Validators.required ]);
  cashfree = signal<any>(null);

  constructor(
    private balanceService: BalanceService
  ) {}

  async ngOnInit(): Promise<void> {
    this.subscription.add(
      this.balanceService.getBalance()
        .subscribe(({ balance }) => {
          this.balance.set(balance);
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
                .subscribe(({ balance }) => {
                  this.balance.set(balance);
                  this.input.reset();
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
