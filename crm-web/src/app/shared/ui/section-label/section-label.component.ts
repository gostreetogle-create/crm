import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-section-label',
  standalone: true,
  template: `
    <span class="sectionLabel" [class.sectionLabelCorner]="corner">{{ text }}</span>
  `,
  styleUrl: './section-label.component.scss',
})
export class SectionLabelComponent {
  @Input({ required: true }) text!: string;
  @Input() corner = true;
}

