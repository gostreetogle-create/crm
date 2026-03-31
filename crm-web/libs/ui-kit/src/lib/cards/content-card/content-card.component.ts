import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-content-card',
  standalone: true,
  template: `
    <section
      class="card"
      [class.card--density-compact]="density === 'compact'"
      [class.cardConstrainedWidth]="!!maxInlineSize"
      [style.max-width]="maxInlineSize ?? undefined"
    >
      @if (!hideTitle) {
        <h2 class="cardTitle">{{ title }}</h2>
      }
      <ng-content></ng-content>
    </section>
  `,
  styleUrl: './content-card.component.scss',
})
export class ContentCardComponent {
  @Input({ required: true }) title!: string;
  @Input() hideTitle = false;
  /**
   * Ограничить ширину карточки (например `min(100%, 42rem)`), чтобы фон и тулбар
   * совпадали с узкой таблицей, а не тянулись на всю колонку грида.
   */
  @Input() maxInlineSize: string | undefined;
  /** Плотная карточка для плиток хаба справочников. */
  @Input() density: 'default' | 'compact' = 'default';
}


