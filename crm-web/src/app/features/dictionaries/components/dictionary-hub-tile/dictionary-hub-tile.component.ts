import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContentCardComponent } from '../../../../shared/ui/content-card/content-card.component';
import { HubCrudExpandableShellComponent } from '../../../../shared/ui/hub-crud-expandable/public-api';

/**
 * Оболочка плитки справочника на хабе: секция сетки + раскрываемый shell + карточка без заголовка.
 * Содержимое (обычно crud-layout) проецируется внутрь карточки.
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
