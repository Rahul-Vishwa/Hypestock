import { NgClass } from '@angular/common';
import { Component, input, numberAttribute, OnChanges, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { OrderService } from '../../../services/order.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { EventService } from '../../../services/event.service';
import { SocketService } from '../../../../core/services/socket.service';
import { AuthService } from '@auth0/auth0-angular';
import { Order } from '../../../../shared/interface/interface';

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
export class PlaceOrderComponent implements OnInit, OnDestroy {
  eventId = input.required<string>();
  ipoPrice = input.required<string>();
  private subscription = new Subscription();
  form: FormGroup<Form> = new FormGroup<Form>({
    price: new FormControl(null, [ Validators.required, Validators.max(999999) ]),
    quantity: new FormControl(null, [ Validators.required, Validators.max(9999) ]),
  });
  isRunning = signal<boolean>(false);
  isIpoRunning = signal<boolean>(false);

  constructor(
    private event: EventService,
    private order: OrderService,
    private toast: ToastService,
    private socket: SocketService,
    private auth: AuthService
  ){}
  
  ngOnInit(): void {
    this.socket.emitStatusRequest(this.eventId());

    this.socket.onIpoStart(() => {
      this.isIpoRunning.set(true);
      this.form.controls['price'].setValue(
        numberAttribute(this.ipoPrice())
      );
      this.form.controls['price'].disable();
    });

    this.socket.onEventStart(() => {
      this.isRunning.set(true);
      this.isIpoRunning.set(false);
      this.form.controls['price'].reset();
      this.form.controls['price'].enable();
    });
    
    this.socket.onEventEnd(() => {
      this.isRunning.set(false);
    });
    // this.testBot();
  }

  testBot() {
    this.auth.user$.subscribe(user => {
      let mockOrders:{
        eventId: string,
        side: 'ask' | 'bid',
        price: number, 
        quantity: number
      }[];
      const eventId = this.eventId();

      if (user?.given_name === 'sames') {
        mockOrders = [
          { eventId, side: "bid", price: 64, quantity: 1 },
          { eventId, side: "ask", price: 59, quantity: 3 },
          { eventId, side: "bid", price: 72, quantity: 2 },
          { eventId, side: "bid", price: 58, quantity: 3 },
          { eventId, side: "ask", price: 69, quantity: 2 },
          { eventId, side: "bid", price: 60, quantity: 2 },
          { eventId, side: "ask", price: 61, quantity: 1 },
          { eventId, side: "bid", price: 66, quantity: 2 },
          { eventId, side: "ask", price: 65, quantity: 3 },
          { eventId, side: "ask", price: 57, quantity: 2 },
          { eventId, side: "ask", price: 71, quantity: 2 },
          { eventId, side: "bid", price: 56, quantity: 5 },
          { eventId, side: "ask", price: 73, quantity: 4 },
          { eventId, side: "bid", price: 70, quantity: 3 },
          { eventId, side: "bid", price: 68, quantity: 1 },
          { eventId, side: "bid", price: 62, quantity: 4 },
          { eventId, side: "ask", price: 63, quantity: 2 },
          { eventId, side: "ask", price: 67, quantity: 3 },
          { eventId, side: "bid", price: 54, quantity: 3 },
          { eventId, side: "ask", price: 55, quantity: 4 }
        ];         
      }
      else {
        mockOrders = [
          { eventId, side: "ask", price: 69, quantity: 2 },
          { eventId, side: "ask", price: 56, quantity: 5 },
          { eventId, side: "ask", price: 71, quantity: 4 },
          { eventId, side: "bid", price: 67, quantity: 2 },
          { eventId, side: "bid", price: 68, quantity: 3 },
          { eventId, side: "ask", price: 70, quantity: 4 },
          { eventId, side: "bid", price: 66, quantity: 1 },
          { eventId, side: "bid", price: 65, quantity: 3 },
          { eventId, side: "ask", price: 64, quantity: 3 },
          { eventId, side: "ask", price: 66, quantity: 5 },
          { eventId, side: "bid", price: 61, quantity: 4 },
          { eventId, side: "bid", price: 63, quantity: 5 },
          { eventId, side: "ask", price: 60, quantity: 4 },
          { eventId, side: "ask", price: 68, quantity: 1 },
          { eventId, side: "bid", price: 62, quantity: 2 },
          { eventId, side: "ask", price: 67, quantity: 2 },
          { eventId, side: "bid", price: 64, quantity: 2 },
          { eventId, side: "ask", price: 72, quantity: 5 },
          { eventId, side: "bid", price: 59, quantity: 3 },
          { eventId, side: "bid", price: 60, quantity: 1 }
        ];
      }

      const maxTime = 60 * 1000;
      
      for (let order of mockOrders) {
        const randomDelay = Math.floor(Math.random() * maxTime);
    
        setTimeout(() => {
          const now = new Date().toISOString();
          console.log(`${JSON.stringify(order)} at ${now}`);
          
          this.testPlaceOrder(order.side, order.price, order.quantity);
        }, randomDelay);
      }
    })
  }

  testPlaceOrder(side: 'bid' | 'ask', price: number, quantity: number) {
    this.order.placeOrder({
      eventId: this.eventId(),
      price,
      quantity,
      side
    })
    .subscribe(({ message }) => {
        this.toast.info(message);
    });
  }

  placeOrder(side: 'bid' | 'ask') {
    const order = {
      eventId: this.eventId(),
      price: this.form.controls['price'].value!,
      quantity: this.form.controls['quantity'].value!,
      side
    };
    if (this.isIpoRunning()) {
      this.order.placeIpoOrder(order)
        .subscribe(({ message }) => {
          this.toast.info(message);
          this.form.controls['quantity'].reset();
        });
    }
    else {
      this.order.placeOrder(order)
        .subscribe(({ message }) => {
          this.toast.info(message);
          this.form.reset();
        });
    }
  }

  disabled(type: 'buy' | 'sell') {
    if (type === 'sell') {
      return this.form.invalid || !this.isRunning();
    }
    return this.form.invalid || (!this.isRunning() && !this.isIpoRunning());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
