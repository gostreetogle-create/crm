import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-ui-checkbox-field',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiCheckboxFieldComponent),
      multi: true,
    },
  ],
  template: `
    <label class="checkboxField">
      <input
        type="checkbox"
        [checked]="value"
        [disabled]="disabled"
        (change)="onChanged($event)"
        (blur)="markTouched()"
      />
      <span>{{ label }}</span>
    </label>
  `,
  styleUrl: './ui-checkbox-field.component.scss',
})
export class UiCheckboxFieldComponent implements ControlValueAccessor {
  @Input({ required: true }) label = '';
  value = false;
  disabled = false;

  private onChange: (value: boolean) => void = () => {};
  private onTouchedCallback: () => void = () => {};

  onChanged(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.checked;
    this.onChange(this.value);
  }

  markTouched(): void {
    this.onTouchedCallback();
  }

  writeValue(value: boolean): void {
    this.value = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}



