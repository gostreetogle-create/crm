import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucidePlus } from '@lucide/angular';
import { API_CONFIG, resolveTradeGoodLinePhotoUrl } from '@srm/platform-core';
import { ContentCardComponent, PageShellComponent } from '@srm/ui-kit';
import { AssignPayload, ProductionLineSnapshot, ProductionStatus } from '../../production.types';
import { ProductionOrderStore } from '../../state/production-order.store';

@Component({
  standalone: true,
  selector: 'app-production-order-page',
  imports: [CommonModule, FormsModule, RouterLink, PageShellComponent, ContentCardComponent, LucidePlus],
  providers: [ProductionOrderStore],
  templateUrl: './production-order-page.html',
  styleUrl: './production-order-page.scss',
})
export class ProductionOrderPage implements OnInit {
  readonly route = inject(ActivatedRoute);
  readonly store = inject(ProductionOrderStore);
  private readonly api = inject(API_CONFIG);
  readonly mediaBaseUrl = this.api.baseUrl.replace(/\/$/, '');
  readonly assigningLineNo = signal<number | null>(null);
  readonly assignForm = signal<{ workerId: string; startDate: string; endDate: string }>({
    workerId: '',
    startDate: '',
    endDate: '',
  });

  readonly progress = computed(() => this.store.progress());
  readonly progressPercent = computed(() => {
    const p = this.progress();
    if (!p.total) return 0;
    return Math.round((p.done / p.total) * 100);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.store.loadOrder(id);
    this.store.loadWorkers();
  }

  badgeLabel(status: ProductionStatus | null | undefined): string {
    if (status === 'IN_PROGRESS') return 'В работе';
    if (status === 'DONE') return 'Выполнен';
    return 'Ожидает';
  }

  hasLinePhoto(line: ProductionLineSnapshot): boolean {
    const photo = line.photoUrl || line.photo || line.imageUrl || line.thumbnailUrl;
    return typeof photo === 'string' && photo.trim().length > 0;
  }

  resolveLinePhoto(line: ProductionLineSnapshot): string {
    const raw = line.photoUrl || line.photo || line.imageUrl || line.thumbnailUrl || '';
    return resolveTradeGoodLinePhotoUrl(raw, this.mediaBaseUrl);
  }

  lineSnapshotLabel(line: ProductionLineSnapshot): string {
    const s = line.status ?? 'DESIGNING';
    if (s === 'IN_PROGRESS') return 'В работе';
    if (s === 'DONE') return 'Готово';
    return 'Проектирование';
  }

  lineSnapshotClass(line: ProductionLineSnapshot): string {
    const s = line.status ?? 'DESIGNING';
    if (s === 'IN_PROGRESS') return 'in-progress';
    if (s === 'DONE') return 'done';
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

  openAssign(lineNo: number): void {
    this.assigningLineNo.set(lineNo);
    this.assignForm.set({ workerId: '', startDate: '', endDate: '' });
  }

  saveAssign(): void {
    const current = this.store.order();
    const lineNo = this.assigningLineNo();
    if (!current || lineNo == null) return;
    const form = this.assignForm();
    if (!form.workerId || !form.startDate || !form.endDate) return;
    const body: AssignPayload = {
      lineNo,
      workerId: form.workerId,
      startDate: form.startDate,
      endDate: form.endDate,
      status: 'PENDING',
    };
    this.store.assign(current.id, body);
    this.assigningLineNo.set(null);
  }

  markDone(assignmentId: string): void {
    this.store.updateAssignment(assignmentId, { status: 'DONE' });
  }

  remove(assignmentId: string): void {
    this.store.removeAssignment(assignmentId);
  }

  startOrder(): void {
    const current = this.store.order();
    if (!current) return;
    // MVP: запуск заказа через обновление статуса первой назначенной позиции.
    const first = current.assignments[0];
    if (first) {
      this.store.updateAssignment(first.id, { status: 'IN_PROGRESS' });
    }
  }

  finishOrder(): void {
    const current = this.store.order();
    if (!current || !this.store.allDone()) return;
    for (const assignment of current.assignments) {
      if (assignment.status !== 'DONE') {
        this.store.updateAssignment(assignment.id, { status: 'DONE' });
      }
    }
  }
}
