import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  LucideCircleAlert,
  LucideCircleCheck,
  LucideInbox,
  LucideLoader2,
} from '@lucide/angular';

export type UiStateCardTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * Компактная плитка состояния (loading / success / empty / error) — эталон для демо и гайдов.
 */
@Component({
  selector: 'app-ui-state-card',
  standalone: true,
  imports: [LucideLoader2, LucideCircleCheck, LucideInbox, LucideCircleAlert],
  template: `
    <article
      class="uiStateCard"
      [class.uiStateCard--info]="tone() === 'info'"
      [class.uiStateCard--success]="tone() === 'success'"
      [class.uiStateCard--warning]="tone() === 'warning'"
      [class.uiStateCard--danger]="tone() === 'danger'"
    >
      <h4 class="uiStateCardTitle">
        <span class="uiStateCardIcon" aria-hidden="true">
          @switch (tone()) {
            @case ('info') {
              <svg lucideLoader2 [size]="18"></svg>
            }
            @case ('success') {
              <svg lucideCircleCheck [size]="18"></svg>
            }
            @case ('warning') {
              <svg lucideInbox [size]="18"></svg>
            }
            @case ('danger') {
              <svg lucideCircleAlert [size]="18"></svg>
            }
          }
        </span>
        {{ title() }}
      </h4>
      <ng-content />
    </article>
  `,
  styleUrl: './ui-state-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiStateCardComponent {
  readonly tone = input.required<UiStateCardTone>();
  readonly title = input.required<string>();
}


