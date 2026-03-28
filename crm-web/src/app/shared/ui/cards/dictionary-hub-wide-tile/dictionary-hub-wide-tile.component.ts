import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContentCardComponent } from '../content-card/content-card.component';
import { HubCrudExpandableShellComponent } from '../../hub-crud-expandable/public-api';

/**
 * Широкая плитка (на всю ширину `dictionaryGrid` в колонке страницы): тот же паттерн, что
 * {@link DictionaryHubTileComponent}, плюс `grid-column: 1 / -1` на хосте.
 * Эталон: Demo п.1.1; для материалов и составных гидов из нескольких справочников.
 */
@Component({
  selector: 'app-dictionary-hub-wide-tile',
  standalone: true,
  imports: [ContentCardComponent, HubCrudExpandableShellComponent],
  templateUrl: './dictionary-hub-wide-tile.component.html',
  styleUrl: './dictionary-hub-wide-tile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DictionaryHubWideTileComponent {
  readonly tileKey = input.required<string>();
}
