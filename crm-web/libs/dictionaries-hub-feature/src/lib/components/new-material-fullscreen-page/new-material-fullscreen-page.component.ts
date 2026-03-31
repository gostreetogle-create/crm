import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { ContentCardComponent, UiButtonComponent } from '@srm/ui-kit';

/**
 * Оболочка полноэкранного создания материала / характеристики (`newMaterialPage` layout).
 * Контент формы и блок действий — через проекцию (`nmBody`, `nmActions`).
 */
@Component({
  selector: 'app-new-material-fullscreen-page',
  standalone: true,
  imports: [ContentCardComponent, UiButtonComponent],
  templateUrl: './new-material-fullscreen-page.component.html',
  styleUrl: './new-material-fullscreen-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewMaterialFullscreenPageComponent {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly pageTitle = input.required<string>();
  readonly headingId = input<string>('new-material-fullscreen-title');
  readonly backClicked = output<void>();

  constructor() {
    afterNextRender(() => {
      const root = this.el.nativeElement;
      setTimeout(() => {
        const title = root.querySelector('h1.newMaterialPage__title') as HTMLElement | null;
        if (title) {
          title.setAttribute('tabindex', '-1');
          title.focus({ preventScroll: true });
          return;
        }
        const first = root.querySelector(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ) as HTMLElement | null;
        first?.focus();
      }, 0);
    });
  }
}
