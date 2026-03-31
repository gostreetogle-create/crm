import { Component, Input, ViewEncapsulation } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-ui-form-field',
  standalone: true,
  imports: [NgIf],
  template: `
    <label class="fieldLabel">
      <span class="fieldTitle">
        {{ label }}<span class="requiredMark" *ngIf="required"> *</span>
      </span>
      <ng-content></ng-content>
      <span class="fieldError" *ngIf="errorText">{{ errorText }}</span>
    </label>
  `,
  styleUrl: './ui-form-field.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.wide]': 'wide',
    '[class.invalid]': 'invalid',
    class: 'ui-form-field',
  },
})
export class UiFormFieldComponent {
  @Input({ required: true }) label = '';
  @Input() required = false;
  @Input() errorText = '';
  @Input() invalid = false;
  @Input() wide = false;
}



