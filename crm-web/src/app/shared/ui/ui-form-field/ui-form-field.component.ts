import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-ui-form-field',
  standalone: true,
  imports: [NgIf],
  template: `
    <label class="fieldLabel">
      <span class="fieldTitle">
        {{ label }}<span *ngIf="required"> *</span>
      </span>
      <ng-content></ng-content>
      <span class="fieldError" *ngIf="errorText">{{ errorText }}</span>
    </label>
  `,
  styleUrl: './ui-form-field.component.scss',
  host: {
    '[class.wide]': 'wide',
    '[class.invalid]': 'invalid',
  },
})
export class UiFormFieldComponent {
  @Input({ required: true }) label = '';
  @Input() required = false;
  @Input() errorText = '';
  @Input() invalid = false;
  @Input() wide = false;
}

