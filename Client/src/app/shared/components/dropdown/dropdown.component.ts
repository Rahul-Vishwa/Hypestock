import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
import { ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-dropdown',
  imports: [
    FormsModule,
    NgClass,
    ClickOutsideDirective
  ],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: DropdownComponent,
      multi: true,
    },
  ],
})
export class DropdownComponent implements ControlValueAccessor {
  id = input.required<string>();
  label = input<string>('');
  options = input.required<{ value: string | number, label: string }[]>();
  value: string | number = '';
  formControl = input.required<FormControl>();
  isOpen = false;
  
  private onChange = (value: string | number) => {};
  private onTouched = () => {};

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouched();
    }
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  selectOption(option: { value: string | number, label: string }): void {
    this.value = option.value;
    this.onChange(option.value);
    this.closeDropdown();
  }

  getSelectedLabel(): string {
    const selectedOption = this.options().find(opt => opt.value === this.value);
    return selectedOption?.label || '';
  }

  get isInvalid(): boolean {
    return !!this.formControl().invalid && !!this.formControl().touched;
  }

  get isRequired(): boolean {
    return this.formControl().hasValidator(Validators.required);
  }
}
