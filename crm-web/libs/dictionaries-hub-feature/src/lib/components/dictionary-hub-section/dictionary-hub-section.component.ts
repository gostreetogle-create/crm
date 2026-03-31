import { Component, input } from '@angular/core';

/**
 * Секция хаба справочников: заголовок + сетка плиток. Стили — `dictionary-hub-shell`.
 */
@Component({
  selector: 'app-dictionary-hub-section',
  standalone: true,
  templateUrl: './dictionary-hub-section.component.html',
  styleUrl: './dictionary-hub-section.component.scss',
})
export class DictionaryHubSectionComponent {
  readonly visible = input(false);
  readonly headingId = input.required<string>();
  readonly title = input.required<string>();
}


