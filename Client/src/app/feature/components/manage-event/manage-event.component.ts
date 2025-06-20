import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Event, EventForm } from '../../../shared/interface/interface';
import { InputComponent } from "../../../shared/components/input/input.component";
import { DropdownComponent } from "../../../shared/components/dropdown/dropdown.component";
import { DatepickerComponent } from "../../../shared/components/datepicker/datepicker.component";
import { NgClass } from '@angular/common';
import { EventService } from '../../services/event.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Observable, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-manage-event',
  imports: [
    ReactiveFormsModule,
    InputComponent,
    DropdownComponent,
    NgClass    
  ],
  templateUrl: './manage-event.component.html',
  styleUrl: './manage-event.component.css'
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
      if (params && params.get('edit')){
        this.form.controls['id'].setValue(params.get('edit'));
        this.event.getEvent(params.get('edit')!)
          .subscribe(({event}) => {
            this.form.patchValue(event);
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
    });
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
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
