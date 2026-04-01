import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Презентационная карточка просмотра записи справочника в модалке: «витрина» без полей ввода.
 * Тело (панели, списки) — через проекцию внутрь {@link DictionaryPreviewCardComponent}.
 */
@Component({
  selector: 'app-dictionary-preview-card',
  standalone: true,
  templateUrl: './dictionary-preview-card.component.html',
  styleUrl: './dictionary-preview-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class DictionaryPreviewCardComponent {
  /** Акцентный цвет (HEX) для градиентов и свотчей-окружения. */
  readonly accentColor = input<string>('#3b5bdb');
  readonly title = input.required<string>();
  readonly code = input<string | null>(null);
  readonly isActive = input(true);
  readonly activeLabel = input('Активна');
  readonly inactiveLabel = input('Неактивна');
  /** Крупная часть цены (уже отформатированная). */
  readonly pricePrimary = input.required<string>();
  /** Вторая строка цены (например «₽ за 1 м»). */
  readonly priceSecondary = input<string>('');
  readonly photoLabel = input('Фото');
  readonly photoHint = input('заливка позиции');
  readonly imageSrc = input<string | null>(null);
  readonly imageAlt = input<string | null>(null);
  readonly ariaLabel = input('Карточка записи');
}
