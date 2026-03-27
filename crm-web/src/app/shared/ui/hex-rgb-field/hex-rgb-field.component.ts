import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UiFormFieldComponent } from '../ui-form-field/ui-form-field.component';

@Component({
  selector: 'app-hex-rgb-field',
  standalone: true,
  imports: [ReactiveFormsModule, UiFormFieldComponent],
  template: `
    <app-ui-form-field
      [label]="label"
      [required]="required"
      [invalid]="invalid"
      [errorText]="errorText"
      [wide]="wide"
    >
      <div class="hexRgbRow">
        <input
          type="text"
          [formControl]="control"
          [placeholder]="placeholder"
          (blur)="normalizeControlHex()"
        />
        <input
          type="color"
          class="colorPicker"
          [value]="pickerHex"
          [disabled]="control.disabled"
          aria-label="Выбор цвета"
          (input)="onColorPicked($event)"
        />
      </div>
      <span class="rgbValue">RGB: {{ rgbValue }}</span>
    </app-ui-form-field>
  `,
  styleUrl: './hex-rgb-field.component.scss',
})
export class HexRgbFieldComponent {
  @Input({ required: true }) control!: FormControl<string>;
  @Input() label = 'Цвет (HEX)';
  @Input() placeholder = '#AABBCC';
  @Input() required = false;
  @Input() invalid = false;
  @Input() errorText = '';
  @Input() wide = false;

  get pickerHex(): string {
    const parsed = this.parseHex(this.control.value);
    return parsed ?? '#000000';
  }

  get rgbValue(): string {
    const parsed = this.parseHex(this.control.value);
    if (!parsed) {
      return '—';
    }
    const r = Number.parseInt(parsed.slice(0, 2), 16);
    const g = Number.parseInt(parsed.slice(2, 4), 16);
    const b = Number.parseInt(parsed.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  onColorPicked(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    const normalized = this.normalizeHex(target.value);
    this.control.setValue(normalized);
    this.control.markAsDirty();
    this.control.markAsTouched();
  }

  normalizeControlHex(): void {
    const normalized = this.normalizeHex(this.control.value);
    if (normalized !== this.control.value) {
      this.control.setValue(normalized);
    }
  }

  private parseHex(value: string | null | undefined): string | null {
    if (!value) return null;
    const clean = value.trim().replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return clean.toUpperCase();
  }

  private normalizeHex(value: string | null | undefined): string {
    if (!value) return '';
    const parsed = this.parseHex(value);
    if (!parsed) {
      return value.trim();
    }
    return `#${parsed}`;
  }
}
