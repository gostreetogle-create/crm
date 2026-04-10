import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type UiStatusSelectOption = {
  key: string;
  label: string;
  disabled: boolean;
};

/**
 * Универсальный селект для выбора статуса с поддержкой disabled-опций.
 * Использует ngModel вместо [value] для стабильной синхронизации
 * с Angular change detection при асинхронном обновлении данных.
 *
 * @input currentStatus — текущий ключ статуса (ProposalStatusKey)
 * @input options — список опций с флагом disabled (из правил переходов)
 * @input processing — блокирует весь select на время HTTP-запроса
 * @output statusChange — эмитит новый ключ только если он отличается от текущего
 */
@Component({
  selector: 'ui-status-select',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select
      [ngModel]="currentStatus()"
      (ngModelChange)="onNgModelChange($event)"
      [disabled]="processing()"
      [class]="selectClass()"
    >
      @for (opt of options(); track opt.key) {
        <option [value]="opt.key" [disabled]="opt.disabled">{{ opt.label }}</option>
      }
    </select>
  `,
})
export class UiStatusSelectComponent {
  currentStatus = input.required<string>();
  options = input.required<readonly UiStatusSelectOption[]>();
  processing = input(false);
  /** CSS-класс для нативного select (стили задаются снаружи, напр. в dictionaries-page). */
  selectClass = input('');
  statusChange = output<string>();

  protected onNgModelChange(next: string): void {
    if (next !== this.currentStatus()) {
      this.statusChange.emit(next);
    }
  }
}
