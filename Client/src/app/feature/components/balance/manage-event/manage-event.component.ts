import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Event, EventForm } from '../../../../shared/interface/interface';
import { InputComponent } from "../../../../shared/components/input/input.component";
import { DropdownComponent } from "../../../../shared/components/dropdown/dropdown.component";
import { NgClass } from '@angular/common';
import { EventService } from '../../../services/event.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Observable, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { compareDates, getDate } from '../../../../shared/utility/time';

@Component({
  selector: 'app-manage-event',
  imports: [
    ReactiveFormsModule,
    InputComponent,
    DropdownComponent,
    NgClass    
  ],
  templateUrl: './manage-event.component.html',
  styleUrl: './manage-event.component.css',
})
export class ManageEventComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();
  categories = signal([
    { label: 'Sports', value: 'Sports' },
    { label: 'Technology', value: 'Technology' },
    { label: 'Health', value: 'Health' },
    { label: 'Education', value: 'Education' },
    { label: 'Entertainment', value: 'Entertainment' },
    { label: 'Music', value: 'Music' },
    { label: 'Business', value: 'Business' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Politics', value: 'Politics' },
    { label: 'Travel', value: 'Travel' },
    { label: 'Lifestyle', value: 'Lifestyle' },
    { label: 'Art', value: 'Art' },
    { label: 'Gaming', value: 'Gaming' },
    { label: 'Science', value: 'Science' },
    { label: 'Environment', value: 'Environment' },
    { label: 'Food', value: 'Food' },
    { label: 'Fashion', value: 'Fashion' },
    { label: 'Literature', value: 'Literature' },
    { label: 'Spirituality', value: 'Spirituality' },
    { label: 'Fitness', value: 'Fitness' }
  ]);
  form!: FormGroup<EventForm>;

  constructor(
    private fb: FormBuilder,
    private event: EventService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) {}
  
  ngOnInit(): void {
    this.initializeForm();

    this.route.queryParamMap.subscribe(params => {
      const eventId = params.get('edit');
      if (params && eventId){
        this.form.controls['id'].setValue(eventId);
        this.event.getEvent(eventId)
          .subscribe(({event}) => {
            this.form.patchValue(event);
          });
        this.event.canEdit(eventId)
          .subscribe(({canEdit}) => {
            if (!canEdit) {
              this.toast.info("Can't edit event");
              this.form.disable();
            }
          });
      }
      else {
        this.form.reset();
      }
    });
  }

  private initializeForm() {
    this.form = this.fb.group({
      id: new FormControl<string | null>(null),
      title: new FormControl<string | null>(null, [ Validators.required ]),
      description: new FormControl<string | null>(null, [ Validators.required ]),
      category: new FormControl<string | null>(null, [ Validators.required ]),
      date: new FormControl<string | null>(null, [ Validators.required ]),
      startTime: new FormControl<string | null>(null, [ Validators.required ]),
      endTime: new FormControl<string | null>(null, [ Validators.required ]),
      ipo: new FormControl<string | null>(null, [ Validators.required ]),
    });
  }

  onTimeChange(control: FormControl) {
    if (
      this.form.controls['startTime'].value &&
      this.form.controls['endTime'].value
    ) {
      const startTime = getDate(this.form.controls['startTime'].value);
      const endTime = getDate(this.form.controls['endTime'].value);

      if (startTime > endTime) {
        this.toast.info('Start time cannot be equal or greater than end time');
        control.reset();
      }
    }
  }

  onDateChange() {
    if (this.form.controls['date'].value) {
      const selectedDate = new Date(this.form.controls['date'].value);
      const dateToday = new Date();

      if (compareDates(selectedDate, dateToday, 'equal')) {
        if (this.form.controls['startTime'].value) {
          const startTime = getDate(this.form.controls['startTime'].value); 
          if (startTime < new Date()) {
            this.toast.info('Start time cannot be less than current time');
            this.form.controls['startTime'].reset();
          }
        }
        if (this.form.controls['endTime'].value) {
          const endTime = getDate(this.form.controls['endTime'].value); 
          if (endTime < new Date()) {
            this.toast.info('End time cannot be less than current time');
            this.form.controls['endTime'].reset();
          }
        }
      }
      else if (compareDates(selectedDate, dateToday, 'lessThan')) {
        this.toast.info("Date cannot be less than today's date");
        this.form.controls['date'].reset();
      }
    }
  }

  manageEvent() {
    this.form.controls['id'].value ?
      this.callApi(
        this.event.editEvent(
          this.form.value as Event
        )
      ):
      this.callApi(
        this.event.createEvent(
          this.form.value as Event
        )
      );
  }

  private callApi(api: Observable<{ message: string }>) {
    this.subscription.add(
      api.subscribe(({message}) => {
        this.toast.info(message);
        this.form.reset();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
