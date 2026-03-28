import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Один вариант витрины паттерна: заголовок + вводный текст (`.pattern-variant-intro`) + сетка `dictionaryGrid`.
 */
@Component({
  selector: 'app-pattern-variant-section',
  standalone: true,
  template: `
    <article class="patternVariant">
      @if (title()) {
        <h3 class="patternVariantTitle">{{ title() }}</h3>
      }
      <ng-content select=".pattern-variant-intro"></ng-content>
      <div class="dictionaryGrid patternVariantGridTop">
        <ng-content />
      </div>
    </article>
  `,
  styleUrl: './pattern-variant-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatternVariantSectionComponent {
  readonly title = input<string>('');
}
