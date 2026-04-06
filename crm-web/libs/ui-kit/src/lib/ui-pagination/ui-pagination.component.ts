import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-ui-pagination',
  standalone: true,
  imports: [NgIf, NgFor, UiButtonComponent, LucideChevronLeft, LucideChevronRight],
  templateUrl: './ui-pagination.component.html',
  styleUrl: './ui-pagination.component.scss',
})
export class UiPaginationComponent {
  @Input({ required: true }) page = 1;
  @Input({ required: true }) pageCount = 1;
  /** Максимум кнопок с номерами (включая первую и последнюю). По умолчанию 5 → между 1 и N обычно три номера (1, 2, 3 … N). */
  @Input() maxButtons = 5;

  @Output() pageChange = new EventEmitter<number>();

  readonly pages = computed(() => {
    const total = Math.max(1, this.pageCount);
    const current = Math.min(Math.max(1, this.page), total);
    const max = Math.max(3, this.maxButtons);

    if (total <= max) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const inner = max - 2; // окно между 1 и последней страницей
    const half = Math.floor(inner / 2);
    let start = Math.max(2, current - half);
    const end = Math.min(total - 1, start + inner - 1);
    start = Math.max(2, end - inner + 1);

    const result: number[] = [1];
    for (let p = start; p <= end; p++) result.push(p);
    result.push(total);
    return result;
  });

  /** Номера страниц с вставкой «…» между несоседними значениями. */
  readonly pagesWithGaps = computed(() => {
    const nums = this.pages();
    const out: (number | 'gap')[] = [];
    for (let i = 0; i < nums.length; i++) {
      const n = nums[i];
      const prev = i > 0 ? nums[i - 1] : undefined;
      if (n === undefined) continue;
      if (prev !== undefined && n - prev > 1) {
        out.push('gap');
      }
      out.push(n);
    }
    return out;
  });

  canPrev(): boolean {
    return this.page > 1;
  }

  canNext(): boolean {
    return this.page < this.pageCount;
  }

  go(page: number): void {
    const clamped = Math.min(Math.max(1, page), Math.max(1, this.pageCount));
    if (clamped !== this.page) {
      this.pageChange.emit(clamped);
    }
  }
}



