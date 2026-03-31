import { Component } from '@angular/core';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  template: `
    <div class="page">
      <ng-content></ng-content>
    </div>
  `,
  styleUrl: './page-shell.component.scss',
})
export class PageShellComponent {}



