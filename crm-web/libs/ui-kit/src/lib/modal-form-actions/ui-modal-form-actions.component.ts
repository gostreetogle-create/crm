import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButtonComponent } from '../ui-button/ui-button.component';

/**
 * Стандартный футер модалки со справочной формой: «Закрыть»/«Отмена» + submit, привязанный к форме по id.
 * Хост с `display: contents`, чтобы кнопки оставались прямыми flex-элементами в `.modalActions`.
 */
@Component({
  selector: 'app-ui-modal-form-actions',
  standalone: true,
  imports: [UiButtonComponent],
  template: `
    <app-ui-button variant="soft" type="button" (clicked)="dismiss.emit()">
      {{ viewMode() ? 'Закрыть' : 'Отмена' }}
    </app-ui-button>
    @if (!viewMode()) {
      <app-ui-button type="submit" [form]="formId()">
        {{ submitLabel() }}
      </app-ui-button>
    }
  `,
  styleUrl: './ui-modal-form-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiModalFormActionsComponent {
  /** Режим просмотра: только «Закрыть», без submit. */
  readonly viewMode = input(false);
  /** Атрибут `id` формы внутри модалки (например `work-types-form`). */
  readonly formId = input.required<string>();
  /** Текст основной кнопки (создать / сохранить). */
  readonly submitLabel = input.required<string>();

  readonly dismiss = output<void>();
}


