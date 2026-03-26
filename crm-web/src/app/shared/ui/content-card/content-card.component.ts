import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-content-card',
  standalone: true,
  template: `
    <section class="card">
      <h2 class="cardTitle">{{ title }}</h2>
      <ng-content></ng-content>
    </section>
  `,
  styleUrl: './content-card.component.scss',
})
export class ContentCardComponent {
  @Input({ required: true }) title!: string;
}

