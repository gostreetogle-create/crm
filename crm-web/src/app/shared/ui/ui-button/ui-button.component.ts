import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  template: `
    <button
      [attr.type]="type"
      [attr.form]="form"
      class="uiButton"
      [class.uiButtonSoft]="variant === 'soft'"
      [class.uiButtonDanger]="variant === 'danger'"
      [disabled]="disabled"
      (click)="clicked.emit()"
    >
      <ng-content></ng-content>
    </button>
  `,
  styleUrl: './ui-button.component.scss',
})
export class UiButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() form: string | null = null;
  @Input() variant: 'primary' | 'soft' | 'danger' = 'primary';
  @Input() disabled = false;

  @Output() readonly clicked = new EventEmitter<void>();
}

