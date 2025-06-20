import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
import { ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-datepicker',
  imports: [
    FormsModule,
    NgClass,
    ClickOutsideDirective
  ],
  templateUrl: './datepicker.component.html',
  styleUrl: './datepicker.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: DatepickerComponent,
      multi: true,
    },
  ],
})
export class DatepickerComponent implements ControlValueAccessor {
  id = input.required<string>();
  label = input<string>('');
  minDate = input<Date | null>(null);
  maxDate = input<Date | null>(null);
  value: string = '';
  formControl = input.required<FormControl>();
  isOpen = false;
  isMonthOpen = false;
  isYearOpen = false;
  
  currentDate = new Date();
  selectedDate: Date | null = null;
  daysInMonth: number[] = [];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  years: number[] = [];
  dateValue: Date | null = null;
  
  private onChange = (value: string) => {};
  private onTouched = () => {};

  constructor() {
    this.generateCalendar();
    this.generateYears();
  }

  writeValue(value: any): void {
    if (!value) {
      this.value = '';
      this.dateValue = null;
      this.selectedDate = null;
      return;
    }

    let date: Date | null = null;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      date = new Date(value);
    }

    if (date && !isNaN(date.getTime())) {
      // Display as yyyy-mm-dd using local date parts
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      this.value = `${yyyy}-${mm}-${dd}`;
      this.dateValue = date;
      this.selectedDate = date;
      this.currentDate = new Date(date);
      this.generateCalendar();
    } else {
      this.value = '';
      this.dateValue = null;
      this.selectedDate = null;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  toggleCalendar(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouched();
    }
    this.isMonthOpen = false;
    this.isYearOpen = false;
  }

  toggleMonthDropdown(): void {
    this.isMonthOpen = !this.isMonthOpen;
    this.isYearOpen = false;
  }

  toggleYearDropdown(): void {
    this.isYearOpen = !this.isYearOpen;
    this.isMonthOpen = false;
  }

  closeCalendar(): void {
    this.isOpen = false;
    this.isMonthOpen = false;
    this.isYearOpen = false;
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    this.daysInMonth = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      this.daysInMonth.push(0);
    }
    
    // Add days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      this.daysInMonth.push(i);
    }
  }

  generateYears(): void {
    const currentYear = new Date().getFullYear();
    this.years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);
  }

  isDateDisabled(day: number): boolean {
    if (day === 0) return true;
    
    const date = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      day
    );

    date.setHours(0, 0, 0, 0);

    const minDate = this.minDate();
    const maxDate = this.maxDate();
  
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
  
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(0, 0, 0, 0);
      if (date > max) return true;
    }

    return false;
  }

  selectDate(day: number): void {
    if (day === 0 || this.isDateDisabled(day)) return;
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const date = new Date(year, month, day);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    this.value = `${yyyy}-${mm}-${dd}`;
    this.dateValue = date;
    this.selectedDate = date;
    this.onChange(this.value);
    this.closeCalendar();
  }

  previousMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  selectMonth(monthIndex: number): void {
    this.currentDate.setMonth(monthIndex);
    this.generateCalendar();
    this.isMonthOpen = false;
  }

  selectYear(year: number): void {
    this.currentDate.setFullYear(year);
    this.generateCalendar();
    this.isYearOpen = false;
  }

  getMonthName(): string {
    return this.currentDate.toLocaleString('default', { month: 'long' });
  }

  getYear(): number {
    return this.currentDate.getFullYear();
  }

  isSelectedDate(day: number): boolean {
    if (!this.selectedDate || day === 0) return false;
    return this.selectedDate.getDate() === day &&
           this.selectedDate.getMonth() === this.currentDate.getMonth() &&
           this.selectedDate.getFullYear() === this.currentDate.getFullYear();
  }

  isSelectedMonth(monthIndex: number): boolean {
    return this.currentDate.getMonth() === monthIndex;
  }

  isSelectedYear(year: number): boolean {
    return this.currentDate.getFullYear() === year;
  }

  get isInvalid(): boolean {
    return !!this.formControl().invalid && !!this.formControl().touched;
  }

  get isRequired(): boolean {
    return this.formControl().hasValidator(Validators.required);
  }
} 