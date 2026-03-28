import { Component, Input, inject } from '@angular/core';
import { LucideMenu } from '@lucide/angular';
import { HubCrudExpandStateService } from './hub-crud-expand-state.service';

@Component({
  selector: 'app-hub-crud-expandable-shell',
  standalone: true,
  imports: [LucideMenu],
  templateUrl: './hub-crud-expandable-shell.component.html',
  styleUrl: './hub-crud-expandable-shell.component.scss',
})
export class HubCrudExpandableShellComponent {
  /** Уникальный ключ плитки (хаб или demo). */
  @Input({ required: true }) tileKey!: string;
  @Input() ariaLabel = 'Показать или скрыть полный список строк таблицы';

  /**
   * При открытии таблица рисуется поверх контента ниже; в потоке остаётся только «полоса» этой высоты
   * (превью), чтобы не прыгала вёрстка. Подстройте под типичную высоту свёрнутой плитки.
   */
  @Input() layoutReserveWhenOpen = 'min(13.5rem, 36vh)';

  readonly expand = inject(HubCrudExpandStateService);
}
