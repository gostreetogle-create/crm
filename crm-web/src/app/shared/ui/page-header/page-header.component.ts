import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type FactRow = {
  label: string;
  value: string;
  code?: string;
};

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) subtitle!: string;
  @Input({ required: true }) facts!: FactRow[];
}

