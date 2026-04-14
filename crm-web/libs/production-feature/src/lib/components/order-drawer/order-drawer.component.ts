import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PermissionsService } from '@srm/authz-runtime';
import { resolveTradeGoodLinePhotoUrl } from '@srm/platform-core';
import { ProductionStore } from '../../state/production.store';

import {
  ProductionLineStatus,
  ProductionLineSnapshot,
  ProductionOrderItemMaterial,
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
export class OrderDrawerComponent implements OnChanges, OnDestroy {
  private readonly permissions = inject(PermissionsService);
  private readonly productionStore = inject(ProductionStore);
  private dateSaveTimer: ReturnType<typeof setTimeout> | null = null;
  @Input({ required: true }) order!: ProductionOrder;
  @Input() commentDraft = '';
  @Input() savingComment = false;
  @Input() progressPercent = 0;
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly startOrder = new EventEmitter<ProductionOrder>();
  @Output() readonly shipOrder = new EventEmitter<ProductionOrder>();
  @Output() readonly commentDraftChange = new EventEmitter<string>();
  @Output() readonly addComment = new EventEmitter<void>();
  @Output() readonly forceStatusChange = new EventEmitter<ProductionStatus>();

  readonly forceStatusOptions: readonly ProductionStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE'];
  forceStatusDraft: ProductionStatus | '' = '';
  startDateDraft = '';
  endDateDraft = '';
  addingMaterialLineNo: number | null = null;
  materialDraft = { name: '', quantity: 1, unit: '' };

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['order'] || !this.order) return;
    this.startDateDraft = this.toInputDate(this.order.productionStart);
    this.endDateDraft = this.toInputDate(this.order.deadline);
    if (this.order.productionStart == null) {
      const today = this.todayIso();
      this.startDateDraft = today;
      this.onDateChange(true);
    }
  }

  ngOnDestroy(): void {
    if (this.dateSaveTimer) {
      clearTimeout(this.dateSaveTimer);
      this.dateSaveTimer = null;
    }
  }

  onBackdropClick(): void {
    this.close.emit();
  }

  onStartOrderClick(event: Event): void {
    event.stopPropagation();
    this.startOrder.emit(this.order);
  }

  onShipOrderClick(event: Event): void {
    event.stopPropagation();
    this.shipOrder.emit(this.order);
  }

  canForceStatus(): boolean {
    return this.permissions.can('production.force_status');
  }

  onForceStatusSelect(raw: string): void {
    const next = raw as ProductionStatus;
    if (!next || next === this.order.productionStatus) {
      this.forceStatusDraft = '';
      return;
    }
    const ok = window.confirm(
      `Изменить статус заказа на ${this.statusLabel(next)}?\nЭто действие обходит стандартный порядок.`,
    );
    if (!ok) {
      this.forceStatusDraft = '';
      return;
    }
    this.forceStatusChange.emit(next);
    this.forceStatusDraft = '';
  }

  statusLabel(status: ProductionStatus): string {
    if (status === 'IN_PROGRESS') return 'В работе';
    if (status === 'DONE') return 'Готово';
    if (status === 'SHIPPED') return 'Отгружено';
    return 'Проектирование';
  }

  statusClass(status: ProductionStatus): string {
    if (status === 'IN_PROGRESS') return 'in-progress';
    if (status === 'DONE') return 'done';
    if (status === 'SHIPPED') return 'shipped';
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

  onDateChange(immediate = false): void {
    if (!this.order?.id) return;
    const commit = () => {
      this.productionStore.updateOrderDates(
        this.order.id,
        this.startDateDraft || null,
        this.endDateDraft || null,
      );
    };
    if (this.dateSaveTimer) {
      clearTimeout(this.dateSaveTimer);
      this.dateSaveTimer = null;
    }
    if (immediate) {
      commit();
      return;
    }
    this.dateSaveTimer = setTimeout(() => {
      this.dateSaveTimer = null;
      commit();
    }, 500);
  }

  lineMaterials(line: ProductionLineSnapshot): ProductionOrderItemMaterial[] {
    return Array.isArray(line.materials) ? line.materials : [];
  }

  openMaterialForm(lineNo: number): void {
    this.addingMaterialLineNo = lineNo;
    this.materialDraft = { name: '', quantity: 1, unit: '' };
  }

  cancelMaterialForm(): void {
    this.addingMaterialLineNo = null;
    this.materialDraft = { name: '', quantity: 1, unit: '' };
  }

  saveMaterial(line: ProductionLineSnapshot): void {
    const name = this.materialDraft.name.trim();
    const unit = this.materialDraft.unit.trim();
    const quantity = Number(this.materialDraft.quantity);
    if (!name || !unit || !Number.isFinite(quantity) || quantity <= 0) return;
    this.productionStore.addOrderItemMaterial(this.order.id, String(line.lineNo), {
      name,
      quantity,
      unit,
    });
    this.cancelMaterialForm();
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toInputDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private lineSnapshotStatus(order: ProductionOrder, lineNo: number): ProductionLineStatus {
    const line = (order.linesSnapshot ?? []).find((item) => item.lineNo === lineNo);
    const status = line?.status;
    if (status === 'IN_PROGRESS' || status === 'DONE' || status === 'DESIGNING') return status;
    return 'DESIGNING';
  }
}
