import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Вертикальный стек блоков «вариант эталона» (например секция Demo про плитки хаба).
 */
@Component({
  selector: 'app-pattern-variant-stack',
  standalone: true,
  template: '<div class="patternVariantStack"><ng-content /></div>',
  styleUrl: './pattern-variant-stack.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatternVariantStackComponent {}


