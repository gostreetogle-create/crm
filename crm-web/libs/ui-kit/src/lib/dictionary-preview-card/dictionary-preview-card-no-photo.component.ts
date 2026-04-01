import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Презентационная карточка просмотра справочника **без** блока фото (тот же визуальный язык, что и {@link DictionaryPreviewCardComponent}).
 * Тело — через проекцию (панели с классами `dictionaryPreviewCard__*`).
 */
@Component({
  selector: 'app-dictionary-preview-card-no-photo',
  standalone: true,
  templateUrl: './dictionary-preview-card-no-photo.component.html',
  styleUrl: './dictionary-preview-card-no-photo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class DictionaryPreviewCardNoPhotoComponent {
  readonly accentColor = input<string>('#3b5bdb');
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly code = input<string | null>(null);
  readonly isActive = input(true);
  /** Показать чип «Активна / …» (для сущностей без статуса в форме — false). */
  readonly showStatus = input(true);
  readonly activeLabel = input('Активна');
  readonly inactiveLabel = input('Неактивна');
  readonly ariaLabel = input('Карточка записи');
}
