import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContentCardComponent } from '../content-card/content-card.component';
import { HubCrudExpandableShellFullscreenComponent } from '../../hub-crud-expandable/public-api';

/**
 * Отдельный вариант «маленькой» плитки хаба:
 * при раскрытии панель раскрывается на всю ширину экрана (fixed overlay),
 * при этом якорь в сетке остаётся на месте (без «прыжка вниз»).
 *
 * Это сделано как отдельный компонент, чтобы не ломать исходную `app-dictionary-hub-tile`.
 */
@Component({
  selector: 'app-dictionary-hub-tile-fullscreen',
  standalone: true,
  imports: [ContentCardComponent, HubCrudExpandableShellFullscreenComponent],
  templateUrl: './dictionary-hub-tile-fullscreen.component.html',
  styleUrl: './dictionary-hub-tile-fullscreen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dictionaryHubTile--fullWidth]': 'fullWidth()',
  },
})
export class DictionaryHubTileFullscreenComponent {
  readonly tileKey = input.required<string>();
  /** На всю ширину сетки (`grid-column: 1 / -1`), например для демо или крупных обзоров. */
  readonly fullWidth = input(false);
}

