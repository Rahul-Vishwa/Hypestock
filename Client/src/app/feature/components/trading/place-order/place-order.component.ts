import { NgClass } from '@angular/common';
import { Component, input, OnChanges, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OrderService } from '../../../services/order.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { EventService } from '../../../services/event.service';
import { SocketService } from '../../../../core/services/socket.service';

interface Form {
  price: FormControl<number | null>;
  quantity: FormControl<number | null>;
}

@Component({
  selector: 'app-place-order',
  imports: [
    NgClass,
    ReactiveFormsModule
  ],
  templateUrl: './place-order.component.html',
  styleUrl: './place-order.component.css'
})
export class PlaceOrderComponent implements OnInit, OnChanges, OnDestroy {
  eventId = input.required<string>();
  private subscription = new Subscription();
  form: FormGroup<Form> = new FormGroup<Form>({
    price: new FormControl(null, [ Validators.required ]),
    quantity: new FormControl(null, [ Validators.required ]),
  });
  isRunning = signal<boolean>(false);

  constructor(
    private event: EventService,
    private order: OrderService,
    private toast: ToastService,
    private socket: SocketService
  ){}
  
  ngOnInit(): void {
    this.socket.onEventStart(() => {
      this.isRunning.set(true);
    });
    this.socket.onEventEnd(() => {
      this.isRunning.set(false);
    });
  }

  ngOnChanges() {
    if (this.eventId()){
      this.subscription.add(
        this.event.isRunning(this.eventId())
        .subscribe(({ isRunning }) => {
          this.isRunning.set(isRunning);
        })
      );
    }
  }

  placeOrder(side: 'bid' | 'ask') {
    this.order.placeOrder(
      this.eventId(),
      this.form.controls['price'].value!,
      this.form.controls['quantity'].value!,
      side
    )
    .subscribe(({ message }) => {
      this.toast.info(message);
      this.form.reset();
    });
  }

  disabled() {
    return this.form.invalid || !this.isRunning();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
