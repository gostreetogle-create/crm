import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { resolveTradeGoodLinePhotoUrl } from '@srm/platform-core';

import {
  ProductionLineStatus,
  ProductionLineSnapshot,
  ProductionOrder,
  ProductionStatus,
} from '../../production.types';

@Component({
  selector: 'app-order-drawer',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './order-drawer.component.html',
  styleUrl: './order-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDrawerComponent {
  @Input({ required: true }) order!: ProductionOrder;
  @Input() commentDraft = '';
  @Input() savingComment = false;
  @Input() progressPercent = 0;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly startOrder = new EventEmitter<ProductionOrder>();
  @Output() readonly commentDraftChange = new EventEmitter<string>();
  @Output() readonly addComment = new EventEmitter<void>();

  onBackdropClick(): void {
    this.close.emit();
  }

  onStartOrderClick(event: Event): void {
    event.stopPropagation();
    this.startOrder.emit(this.order);
  }

  statusLabel(status: ProductionStatus): string {
    if (status === 'IN_PROGRESS') return 'В работе';
    if (status === 'DONE') return 'Готово';
    return 'Проектирование';
  }

  statusClass(status: ProductionStatus): string {
    if (status === 'IN_PROGRESS') return 'in-progress';
    if (status === 'DONE') return 'done';
    return 'pending';
  }

  formatLongDate(dateValue: string | null | undefined): string {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  commentItems(order: ProductionOrder): Array<{ timestamp: string | null; text: string }> {
    if (!order.notes?.trim()) return [];
    return order.notes
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^\[(.+?)\]\s*(.+)$/);
        if (!m) return { timestamp: null, text: line };
        return { timestamp: m[1]?.trim() || null, text: m[2]?.trim() || '' };
      })
      .filter((item) => item.text.length > 0);
  }

  formatCommentTime(timestamp: string | null): string {
    if (!timestamp) return 'Без времени';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  hasLinePhoto(line: ProductionLineSnapshot | undefined): boolean {
    if (!line) return false;
    const photo = line.photoUrl || line.photo || line.imageUrl || line.thumbnailUrl;
    return typeof photo === 'string' && photo.trim().length > 0;
  }

  linePhotoUrl(line: ProductionLineSnapshot | undefined): string {
    if (!line) return '';
    const raw = line.photoUrl || line.photo || line.imageUrl || line.thumbnailUrl || '';
    return resolveTradeGoodLinePhotoUrl(raw, '');
  }

  lineWorker(order: ProductionOrder, lineNo: number): string {
    const assignment = order.assignments?.find((item) => item.lineNo === lineNo);
    return assignment?.workerName || 'Не назначен';
  }

  lineStatus(order: ProductionOrder, lineNo: number): ProductionStatus {
    const status = this.lineSnapshotStatus(order, lineNo);
    if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (status === 'DONE') return 'DONE';
    return 'PENDING';
  }

  private lineSnapshotStatus(order: ProductionOrder, lineNo: number): ProductionLineStatus {
    const line = (order.linesSnapshot ?? []).find((item) => item.lineNo === lineNo);
    const status = line?.status;
    if (status === 'IN_PROGRESS' || status === 'DONE' || status === 'DESIGNING') return status;
    return 'DESIGNING';
  }
}
