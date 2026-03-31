import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContentCardComponent } from '../content-card/content-card.component';
import { HubCrudExpandableShellComponent } from '../../hub-crud-expandable/hub-crud-expandable-shell.component';

/**
 * Плитка справочника на хабе: `dictionaryGrid` → плитка → раскрытие → content-card → crud-layout.
 * По умолчанию — одна ячейка сетки; `[fullWidth]="true"` — на всю ширину `dictionaryGrid` (крупные обзоры, демо).
 * Эталон: Demo п.1 / п.1.1; `/dictionaries`.
 */
@Component({
  selector: 'app-dictionary-hub-tile',
  standalone: true,
  imports: [ContentCardComponent, HubCrudExpandableShellComponent],
  templateUrl: './dictionary-hub-tile.component.html',
  styleUrl: './dictionary-hub-tile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dictionaryHubTile--fullWidth]': 'fullWidth()',
  },
})
export class DictionaryHubTileComponent {
  readonly tileKey = input.required<string>();
  /** На всю ширину сетки в колонке страницы (`grid-column: 1 / -1`). Те же раскрытие и высоты, что у узкой плитки. */
  readonly fullWidth = input(false);
}


