import { NgClass } from '@angular/common';
import { Component, ElementRef, EventEmitter, input, OnInit, Output } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-timepicker',
  imports: [
    NgClass,
    ClickOutsideDirective
  ],
  templateUrl: './timepicker.component.html',
  styleUrl: './timepicker.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: TimepickerComponent,
      multi: true,
    },
  ],
})
export class TimepickerComponent implements OnInit, ControlValueAccessor{
  showTimeDropdown = false;
  hours:string[] = [];
  minutes:string[] = [];
  hour = '';
  minute = '';
  meridian = ''; 
  value: string = '';
  timeToShow: string = '';
  formControl = input.required<FormControl>();
  id = input.required<string>();
  label = input<string>();

  ngOnInit(): void {
    this.hours = Array.from({ length: 12 }, (_, n) => (n + 1).toString().padStart(2, '0'));
    this.minutes = Array.from({ length: 13 }, (_, n) => (5*n).toString().padStart(2, '0'));
  }

  private onChange = (value: string) => {};
  private onTouched = () => {};

  writeValue(value: string | null): void {
    this.value = value || '';
    this.timeToShow = this.convertTo12HourFormat(this.value);

    if (this.value) {
      const [hourStr, minuteStr] = this.value.split(':');
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      this.minute = minute.toString().padStart(2, '0');
  
      this.meridian = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      if (hour === 0) hour = 12;
      this.hour = hour.toString().padStart(2, '0');
    } else {
      this.hour = '';
      this.minute = '';
      this.meridian = '';
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  get isInvalid(): boolean {
    return !!this.formControl().invalid && this.formControl().touched;
  }

  get isRequired(): boolean {
    return this.formControl().hasValidator(Validators.required);
  }

  toggleTimepicker(){
    this.showTimeDropdown = !this.showTimeDropdown;
    this.onTouched();
  }

  closeTimepicker(){
    this.showTimeDropdown = false;
  }

  private convertTo12HourFormat(time24: string): string {
    if (!time24){
      return ''; 
    }
    const [hourStr, minuteStr] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
  
    const meridian = hour >= 12 ? "PM" : "AM";
  
    hour = hour % 12;
    if (hour === 0) hour = 12;
  
    return `${hour}:${minute.toString().padStart(2, "0")} ${meridian}`;
  }

  onSelection(){
    if (this.hour && this.minute && this.meridian){
      const hour = Number(this.hour);
      const minute = Number(this.minute);
      const meridian = this.meridian;

      let hour24 = hour;

      if (meridian === 'AM' && hour === 12) {
        hour24 = 0;
      } else if (meridian === 'PM' && hour < 12) {
        hour24 = hour + 12;
      }

      const formattedTime = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      this.timeToShow = hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0') + ' ' + meridian;
      
      this.value = formattedTime;
      this.onChange(formattedTime);
      this.onTouched();
    }
  }
}
