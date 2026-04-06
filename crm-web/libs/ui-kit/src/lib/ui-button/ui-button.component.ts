import { DOCUMENT } from '@angular/common';
import { Component, EventEmitter, Inject, Input, Optional, Output } from '@angular/core';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  template: `
    <button
      [attr.type]="effectiveButtonType()"
      [attr.form]="effectiveFormAttr()"
      [attr.aria-label]="ariaLabel || null"
      [attr.title]="title || null"
      class="uiButton"
      [class.uiButtonSm]="size === 'sm'"
      [class.uiButtonSquare]="square"
      [class.uiButtonSoft]="variant === 'soft'"
      [class.uiButtonDanger]="variant === 'danger'"
      [disabled]="disabled"
      (click)="onClick($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
  styleUrl: './ui-button.component.scss',
})
export class UiButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  /** Связь с формой по `id`, если кнопка вне `<form>` (футер модалки). */
  @Input() form: string | null = null;
  @Input() variant: 'primary' | 'soft' | 'danger' = 'primary';
  /** Компактный размер (меньше отступы и высота). */
  @Input() size: 'default' | 'sm' = 'default';
  @Input() square = false;
  @Input() disabled = false;
  @Input() ariaLabel: string | null = null;
  @Input() title: string | null = null;

  @Output() readonly clicked = new EventEmitter<void>();

  constructor(@Optional() @Inject(DOCUMENT) private readonly doc: Document | null) {}

  /**
   * Внешняя кнопка «submit» с `form="..."` в портале (модалка на `body`): нативная
   * отправка иногда не доходит до `(ngSubmit)`. Явно вызываем `requestSubmit()`.
   */
  protected onClick(event: MouseEvent): void {
    if (this.type === 'submit' && this.form?.trim()) {
      const formEl = this.doc?.getElementById(this.form.trim());
      if (formEl instanceof HTMLFormElement) {
        event.preventDefault();
        formEl.requestSubmit();
        return;
      }
    }
    this.clicked.emit();
  }

  /** Для внешнего submit используем `type="button"` + `requestSubmit`, чтобы не дублировать нативный submit. */
  protected effectiveButtonType(): 'button' | 'submit' | 'reset' {
    if (this.type === 'submit' && this.form?.trim()) {
      return 'button';
    }
    return this.type;
  }

  protected effectiveFormAttr(): string | null {
    if (this.type === 'submit' && this.form?.trim()) {
      return null;
    }
    return this.form;
  }
}

