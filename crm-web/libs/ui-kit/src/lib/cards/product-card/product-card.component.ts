import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [NgIf],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  @Input({ required: true }) title = '';
  // e-commerce style meta
  @Input() subtitle: string | null = null; // category / brand line (small, muted)
  @Input() tag: string | null = null; // small badge on the right
  @Input() skuLabel: string | null = null;
  @Input() skuValue: string | null = null;

  // Optional description (can be used in other card layouts)
  @Input() description: string | null = null;
  @Input() price: string | null = null;

  // Optional: can be used now, and also remains compatible with future “product” model.
  @Input() imageSrc: string | null = null;
  @Input() imageAlt: string | null = null;
}


