import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { ContentCardComponent, UiButtonComponent } from '@srm/ui-kit';

/**
 * Оболочка полноэкранного create под `/справочники/...` (как «Новый материал»).
 * Контент формы — через проекцию; блок действий — с атрибутом `standaloneFormActions`.
 */
@Component({
  selector: 'app-dictionary-standalone-create-shell',
  standalone: true,
  imports: [ContentCardComponent, UiButtonComponent],
  templateUrl: './dictionary-standalone-create-shell.component.html',
  styleUrl: './dictionary-standalone-create-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DictionaryStandaloneCreateShellComponent {
  private readonly el = inject(ElementRef<HTMLElement>);

  /** Заголовок страницы (h1). */
  readonly pageTitle = input.required<string>();
  /** Связь `main` с заголовком (бэклог #20–21). */
  readonly headingId = input<string>('standalone-dictionary-page-title');
  readonly backClicked = output<void>();

  constructor() {
    afterNextRender(() => {
      const root = this.el.nativeElement;
      const first = root.querySelector(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      if (first instanceof HTMLElement) {
        first.focus();
      }
    });
  }
}
