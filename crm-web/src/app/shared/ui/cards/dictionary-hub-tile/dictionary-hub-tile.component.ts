import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContentCardComponent } from '../content-card/content-card.component';
import { HubCrudExpandableShellComponent } from '../../hub-crud-expandable/public-api';

/**
 * Узкая плитка справочника на хабе: `dictionaryGrid` → плитка → раскрытие → content-card → crud-layout.
 * Эталон: Demo п.1, `/dictionaries` (обычные справочники).
 */
@Component({
  selector: 'app-dictionary-hub-tile',
  standalone: true,
  imports: [ContentCardComponent, HubCrudExpandableShellComponent],
  templateUrl: './dictionary-hub-tile.component.html',
  styleUrl: './dictionary-hub-tile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DictionaryHubTileComponent {
  readonly tileKey = input.required<string>();
}
