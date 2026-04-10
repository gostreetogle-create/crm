import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { API_CONFIG } from '@srm/platform-core';
import {
  AssignPayload,
  ProductionAssignment,
  ProductionLineSnapshot,
  ProductionOrderDetail,
  Worker,
  UpdateAssignmentPayload,
} from '../production.types';

@Injectable()
export class ProductionOrderStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  readonly order = signal<ProductionOrderDetail | null>(null);
  readonly workers = signal<Worker[]>([]);

  readonly allDone = computed(() => {
    const current = this.order();
    if (!current) return false;
    const total = current.linesSnapshot.length;
    if (total === 0) return false;
    const done = current.assignments.filter((a) => a.status === 'DONE').length;
    return done === total;
  });

  loadOrder(id: string): void {
    this.http.get<ProductionOrderDetail>(this.endpoint(`/api/production/orders/${id}`)).subscribe({
      next: (data) => this.order.set(data),
      error: () => this.order.set(null),
    });
  }

  loadWorkers(): void {
    this.http.get<Worker[]>(this.endpoint('/api/workers')).subscribe({
      next: (list) => this.workers.set(Array.isArray(list) ? list : []),
      error: () => this.workers.set([]),
    });
  }

  assign(orderId: string, body: AssignPayload): void {
    this.http.post(this.endpoint(`/api/production/orders/${orderId}/assign`), body).subscribe({
      next: () => this.loadOrder(orderId),
    });
  }

  updateAssignment(id: string, body: UpdateAssignmentPayload): void {
    this.http.put<ProductionAssignment>(this.endpoint(`/api/production/assignments/${id}`), body).subscribe({
      next: () => {
        const orderId = this.order()?.id;
        if (orderId) this.loadOrder(orderId);
      },
    });
  }

  removeAssignment(id: string): void {
    this.http.delete(this.endpoint(`/api/production/assignments/${id}`)).subscribe({
      next: () => {
        const orderId = this.order()?.id;
        if (orderId) this.loadOrder(orderId);
      },
    });
  }

  assignmentForLine(lineNo: number): ProductionAssignment | undefined {
    return this.order()?.assignments.find((a) => a.lineNo === lineNo);
  }

  progress(): { done: number; total: number } {
    const current = this.order();
    if (!current) return { done: 0, total: 0 };
    const total = current.linesSnapshot.length;
    const done = current.assignments.filter((a) => a.status === 'DONE').length;
    return { done, total };
  }

  workerLabel(workerId: string): string {
    const w = this.workers().find((item) => item.id === workerId);
    if (!w) return workerId;
    if (w.name && w.name.trim()) return w.name;
    const full = [w.lastName, w.firstName, w.patronymic].filter(Boolean).join(' ').trim();
    return full || workerId;
  }

  lineRows(): Array<{ line: ProductionLineSnapshot; assignment?: ProductionAssignment }> {
    const current = this.order();
    if (!current) return [];
    return current.linesSnapshot.map((line) => ({
      line,
      assignment: current.assignments.find((a) => a.lineNo === line.lineNo),
    }));
  }

  private endpoint(path: string): string {
    return `${this.api.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
