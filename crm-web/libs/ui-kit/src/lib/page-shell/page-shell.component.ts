import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  template: `
    <div class="page" [class.page--fluid]="fluid">
      <ng-content></ng-content>
    </div>
  `,
  styleUrl: './page-shell.component.scss',
})
export class PageShellComponent {
  /** Без ограничения max-width — контент на всю ширину области main (с учётом padding shell). */
  @Input() fluid = false;
}



