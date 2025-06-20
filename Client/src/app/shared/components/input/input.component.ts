import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ControlValueAccessor, FormControl, FormsModule, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [
    FormsModule,
    NgClass
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: InputComponent,
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  type = input.required<string>();
  id = input.required<string>();
  placeholder = input<string>('');
  label = input<string>('');
  value: string = '';
  formControl = input.required<FormControl>();
  maxlength = input<number>(100);
  disabled = input<boolean>(false);

  private onChange = (value: string) => {};
  private onTouched = () => {};

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(event: Event): void {
    const newValue = (event.target as HTMLInputElement).value;
    this.value = newValue;
    this.onChange(newValue);
    this.onTouched();
  }

  get isInvalid(): boolean {
    return !!this.formControl().invalid && !!this.formControl().touched;
  }

  get isRequired(): boolean {
    return this.formControl().hasValidator(Validators.required);
  }
}
