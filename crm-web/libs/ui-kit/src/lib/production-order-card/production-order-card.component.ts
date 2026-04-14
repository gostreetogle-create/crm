import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { resolveTradeGoodLinePhotoUrl } from '@srm/platform-core';
import { ContentCardComponent } from '../cards/content-card/content-card.component';

export type ProductionOrderCardStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'SHIPPED';
export type ProductionOrderCardLineStatus = 'DESIGNING' | 'IN_PROGRESS' | 'DONE';

export type ProductionOrderCardAssignment = {
  lineNo: number;
  workerName?: string;
  status: ProductionOrderCardStatus;
};

export type ProductionOrderCardLine = {
  lineNo: number;
  name: string;
  qty: number;
  unit: string;
  status?: ProductionOrderCardLineStatus;
  photoUrl?: string | null;
  photo?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  catalogProductId?: string | null;
};

export type ProductionOrderCardModel = {
  id: string;
  orderNumber: string;
  customerLabel: string;
  deadline: string | null;
  productionStatus: ProductionOrderCardStatus;
  assignments: ProductionOrderCardAssignment[];
  linesSnapshot?: ProductionOrderCardLine[];
};

export type ProductionOrderCardPositionOpenEvent = {
  orderId: string;
  lineNo: number;
};

@Component({
  standalone: true,
  selector: 'app-production-order-card',
  imports: [CommonModule, RouterLink, ContentCardComponent],
  templateUrl: './production-order-card.component.html',
  styleUrl: './production-order-card.component.scss',
})
export class ProductionOrderCardComponent {
  @Input({ required: true }) order!: ProductionOrderCardModel;
  @Input() expanded = false;
  @Input() mediaBaseUrl = '';

  @Output() openDrawer = new EventEmitter<ProductionOrderCardModel>();
  @Output() togglePositions = new EventEmitter<string>();
  @Output() openPositionDrawer = new EventEmitter<ProductionOrderCardPositionOpenEvent>();

  isOverdue(order: ProductionOrderCardModel): boolean {
    if (!order.deadline || order.productionStatus === 'DONE') return false;
    const deadline = new Date(order.deadline);
    if (Number.isNaN(deadline.getTime())) return false;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const deadlineStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).getTime();
    return deadlineStart < todayStart;
  }

  progressLabel(order: ProductionOrderCardModel): string {
    const lines = order.linesSnapshot ?? [];
    if (lines.length > 0) {
      const done = lines.filter((l) => l.status === 'DONE').length;
      return `${done} из ${lines.length}`;
    }
    const total = order.assignments?.length ?? 0;
    const done = (order.assignments ?? []).filter((item) => item.status === 'DONE').length;
    return `${done} из ${total}`;
  }

  progressPercent(order: ProductionOrderCardModel): number {
    const lines = order.linesSnapshot ?? [];
    if (lines.length > 0) {
      const done = lines.filter((l) => l.status === 'DONE').length;
      return Math.round((done / lines.length) * 100);
    }
    const total = order.assignments?.length ?? 0;
    if (!total) return 0;
    const done = (order.assignments ?? []).filter((item) => item.status === 'DONE').length;
    return Math.round((done / total) * 100);
  }

  formatDeadline(dateValue: string | null | undefined): string {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  emitOpenDrawer(): void {
    this.openDrawer.emit(this.order);
  }

  emitTogglePositions(event: Event): void {
    event.stopPropagation();
    this.togglePositions.emit(this.order.id);
  }

  lineStatus(order: ProductionOrderCardModel, lineNo: number): ProductionOrderCardStatus {
    const line = (order.linesSnapshot ?? []).find((item) => item.lineNo === lineNo);
    const status = line?.status ?? 'DESIGNING';
    if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (status === 'DONE') return 'DONE';
    return 'PENDING';
  }

  statusClass(status: ProductionOrderCardStatus): string {
    if (status === 'IN_PROGRESS') return 'in-progress';
    if (status === 'DONE') return 'done';
    return 'pending';
  }

  stripeClass(order: ProductionOrderCardModel): string {
    if (this.isOverdue(order)) return 'overdue';
    return this.statusClass(order.productionStatus);
  }

  hasLinePhoto(line: ProductionOrderCardLine | undefined): boolean {
    if (!line) return false;
    const photo = line.photoUrl || line.photo || line.imageUrl || line.thumbnailUrl;
    return typeof photo === 'string' && photo.trim().length > 0;
  }

  linePhotoUrl(line: ProductionOrderCardLine | undefined): string {
    if (!line) return '';
    return line.photoUrl || line.photo || line.imageUrl || line.thumbnailUrl || '';
  }

  resolvePhotoUrl(line: ProductionOrderCardLine | undefined): string {
    const raw = this.linePhotoUrl(line);
    const resolved = resolveTradeGoodLinePhotoUrl(raw, this.mediaBaseUrl);
    console.log('[production-order-card] resolvePhotoUrl', { raw, resolved });
    return resolved;
  }

  emitOpenPosition(lineNo: number, event: Event): void {
    event.stopPropagation();
    this.openPositionDrawer.emit({ orderId: this.order.id, lineNo });
  }
}
