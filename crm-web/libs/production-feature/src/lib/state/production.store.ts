import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { API_CONFIG } from '@srm/platform-core';
import { ToastService } from '@srm/ui-kit';
import {
  AssignPayload,
  ProductionLineStatus,
  ProductionOrderItemMaterial,
  ProductionOrder,
  ProductionStatus,
  UpdateAssignmentPayload,
  Worker,
} from '../production.types';

const ALLOWED_STATUS_TRANSITIONS: Record<ProductionStatus, readonly ProductionStatus[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['DONE'],
  DONE: ['SHIPPED'],
  SHIPPED: [],
};

function canTransitionStatus(current: ProductionStatus, next: ProductionStatus): boolean {
  if (current === next) return true;
  return ALLOWED_STATUS_TRANSITIONS[current].includes(next);
}

@Injectable()
export class ProductionStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);
  private readonly toast = inject(ToastService);

  readonly orders = signal<ProductionOrder[]>([]);
  readonly loading = signal(false);
  readonly filter = signal<'ALL' | ProductionStatus>('ALL');
  readonly workers = signal<Worker[]>([]);

  readonly filteredOrders = computed(() => {
    const mode = this.filter();
    const items = this.orders();
    if (mode === 'ALL') return items;
    return items.filter((o) => o.productionStatus === mode);
  });

  readonly pendingOrders = computed(() => this.filteredOrders().filter((o) => o.productionStatus === 'PENDING'));
  readonly inProgressOrders = computed(() =>
    this.filteredOrders().filter((o) => o.productionStatus === 'IN_PROGRESS'),
  );
  readonly doneOrders = computed(() => this.filteredOrders().filter((o) => o.productionStatus === 'DONE'));
  readonly shippedOrders = computed(() => this.filteredOrders().filter((o) => o.productionStatus === 'SHIPPED'));

  loadOrders(): void {
    this.loading.set(true);
    this.http.get<ProductionOrder[]>(this.endpoint('/api/production/orders')).subscribe({
      next: (items) => {
        this.orders.set(Array.isArray(items) ? items : []);
        this.loading.set(false);
      },
      error: () => {
        this.orders.set([]);
        this.loading.set(false);
      },
    });
  }

  updateOrderStatus(id: string, status: ProductionStatus, options?: { force?: boolean }): void {
    const previousOrders = this.orders();
    const target = previousOrders.find((order) => order.id === id);
    if (!target || target.productionStatus === status) return;
    const force = options?.force === true;
    if (!force && !canTransitionStatus(target.productionStatus, status)) {
      this.toast.show(
        `Недопустимый переход статуса: ${target.productionStatus} -> ${status}.`,
        'error',
      );
      return;
    }

    this.orders.set(
      previousOrders.map((order) =>
        order.id === id ? { ...order, productionStatus: status } : order,
      ),
    );

    this.http.put(this.endpoint(`/api/production/orders/${id}/status`), force ? { status, force: true } : { status }).subscribe({
      error: (err: unknown) => {
        this.orders.set(previousOrders);
        const message = this.resolveStatusUpdateErrorMessage(err);
        this.toast.show(message, 'error');
      },
    });
  }

  shipOrder(orderId: string): void {
    const previousOrders = this.orders();
    const target = previousOrders.find((order) => order.id === orderId);
    if (!target || target.productionStatus === 'SHIPPED') return;

    this.http.put(this.endpoint(`/api/production/orders/${orderId}/status`), { status: 'SHIPPED' }).subscribe({
      next: () => {
        this.orders.set(
          this.orders().map((order) =>
            order.id === orderId ? { ...order, productionStatus: 'SHIPPED' } : order,
          ),
        );
      },
      error: (err: unknown) => {
        const payload =
          typeof err === 'object' && err !== null && 'error' in err
            ? (err as { error?: unknown }).error
            : null;
        const code =
          payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as { error?: unknown }).error ?? '')
            : '';

        if (code === 'insufficient_stock') {
          const item =
            payload && typeof payload === 'object' && 'item' in payload
              ? (payload as { item?: unknown }).item
              : null;
          if (item && typeof item === 'object') {
            const name = String((item as { name?: unknown }).name ?? 'Товар');
            const required = String((item as { required?: unknown }).required ?? '?');
            const available = String((item as { available?: unknown }).available ?? '?');
            this.toast.show(
              `Недостаточно товара на складе: ${name} — нужно ${required}, доступно ${available}`,
              'error',
            );
            return;
          }
        }

        if (code === 'warehouse_product_not_found') {
          const line =
            payload && typeof payload === 'object' && 'line' in payload
              ? (payload as { line?: unknown }).line
              : null;
          const lineName =
            line && typeof line === 'object' && 'name' in line
              ? String((line as { name?: unknown }).name ?? '')
              : '';
          const lineSku =
            line && typeof line === 'object' && 'sku' in line
              ? String((line as { sku?: unknown }).sku ?? '')
              : '';
          const marker = lineSku || lineName || 'позиция заказа';
          this.toast.show(`Товар не найден на складе: ${marker}`, 'error');
          return;
        }

        if (code === 'stock_already_deducted') {
          this.toast.show('Заказ уже был отгружен ранее', 'error');
          this.orders.set(
            previousOrders.map((order) =>
              order.id === orderId ? { ...order, productionStatus: 'SHIPPED' } : order,
            ),
          );
          return;
        }

        this.toast.show('Не удалось выполнить отгрузку', 'error');
      },
    });
  }

  updateOrderSchedule(id: string, productionStart: string, deadline: string): void {
    const previousOrders = this.orders();
    const target = previousOrders.find((order) => order.id === id);
    if (!target) return;

    this.orders.set(
      previousOrders.map((order) =>
        order.id === id ? { ...order, productionStart, deadline } : order,
      ),
    );

    this.http
      .put(this.endpoint(`/api/production/orders/${id}`), {
        productionStart,
        deadline,
      })
      .subscribe({
        error: () => {
          this.orders.set(previousOrders);
          this.toast.show('Не удалось сохранить', 'error');
        },
      });
  }

  updateOrderDates(orderId: string, startDate: string | null, endDate: string | null): void {
    const previousOrders = this.orders();
    const target = previousOrders.find((order) => order.id === orderId);
    if (!target) return;

    this.orders.set(
      previousOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              productionStart: startDate,
              deadline: endDate,
            }
          : order,
      ),
    );

    this.http
      .patch(this.endpoint(`/api/production/orders/${orderId}`), {
        startDate,
        endDate,
      })
      .subscribe({
        error: () => {
          this.orders.set(previousOrders);
          this.toast.show('Не удалось сохранить даты', 'error');
        },
      });
  }

  addOrderItemMaterial(
    orderId: string,
    itemId: string,
    payload: { name: string; quantity: number; unit: string },
  ): void {
    const previousOrders = this.orders();
    this.http
      .post<ProductionOrderItemMaterial>(this.endpoint(`/api/production/orders/${orderId}/items/${itemId}/materials`), payload)
      .subscribe({
        next: (created) => {
          const itemKey = String(itemId);
          const lineNoCandidate = Number(itemId);
          this.orders.set(
            this.orders().map((order) => {
              if (order.id !== orderId) return order;
              const nextLines = (order.linesSnapshot ?? []).map((line) => {
                const byLineNo = Number.isFinite(lineNoCandidate) && line.lineNo === lineNoCandidate;
                const byOrderItemId = itemKey === String((line as { id?: unknown }).id ?? '');
                if (!byLineNo && !byOrderItemId) return line;
                return {
                  ...line,
                  materials: [...(line.materials ?? []), created],
                };
              });
              return { ...order, linesSnapshot: nextLines };
            }),
          );
        },
        error: () => {
          this.orders.set(previousOrders);
          this.toast.show('Не удалось добавить материал', 'error');
        },
      });
  }

  updateOrderNotes(id: string, notes: string | null): void {
    const previousOrders = this.orders();
    const target = previousOrders.find((order) => order.id === id);
    if (!target) return;

    this.orders.set(
      previousOrders.map((order) =>
        order.id === id ? { ...order, notes } : order,
      ),
    );

    this.http
      .put(this.endpoint(`/api/production/orders/${id}`), {
        notes,
      })
      .subscribe({
        error: () => {
          this.orders.set(previousOrders);
          this.toast.show('Не удалось сохранить', 'error');
        },
      });
  }

  progress(order: ProductionOrder): { done: number; total: number } {
    const lines = order.linesSnapshot ?? [];
    const total = lines.length;
    const done = lines.filter((line) => line.status === 'DONE').length;
    return { done, total };
  }

  loadWorkers(): void {
    this.http.get<Worker[]>(this.endpoint('/api/workers')).subscribe({
      next: (list) => this.workers.set(Array.isArray(list) ? list : []),
      error: () => this.workers.set([]),
    });
  }

  assign(orderId: string, body: AssignPayload): void {
    const previousOrders = this.orders();
    this.http.post<unknown>(this.endpoint(`/api/production/orders/${orderId}/assign`), body).subscribe({
      next: (created) => {
        const createdAssignment = created as {
          id?: string;
          orderId?: string;
          lineNo?: number;
          workerId?: string;
          worker?: { name?: string };
          status?: ProductionStatus;
          startDate?: string | null;
          endDate?: string | null;
        };
        if (!createdAssignment?.id) return;
        this.orders.set(
          previousOrders.map((order) => {
            if (order.id !== orderId) return order;
            const nextAssignment = {
              id: String(createdAssignment.id),
              orderId,
              lineNo: Number(createdAssignment.lineNo ?? body.lineNo),
              workerId: String(createdAssignment.workerId ?? body.workerId),
              workerName: createdAssignment.worker?.name,
              status: (createdAssignment.status ?? body.status ?? 'PENDING') as ProductionStatus,
              startDate: createdAssignment.startDate ?? body.startDate,
              endDate: createdAssignment.endDate ?? body.endDate,
            };
            const withoutSameLine = order.assignments.filter((a) => a.lineNo !== nextAssignment.lineNo);
            return { ...order, assignments: [...withoutSameLine, nextAssignment] };
          }),
        );
      },
      error: () => {
        this.orders.set(previousOrders);
        this.toast.show('Не удалось сохранить', 'error');
      },
    });
  }

  updateAssignment(id: string, body: UpdateAssignmentPayload): void {
    const previousOrders = this.orders();
    this.http.put<unknown>(this.endpoint(`/api/production/assignments/${id}`), body).subscribe({
      next: (updated) => {
        const updatedAssignment = updated as {
          id?: string;
          workerId?: string;
          worker?: { name?: string };
          status?: ProductionStatus;
          startDate?: string | null;
          endDate?: string | null;
        };
        const assignmentId = String(updatedAssignment.id ?? id);
        this.orders.set(
          previousOrders.map((order) => ({
            ...order,
            assignments: order.assignments.map((assignment) => {
              if (assignment.id !== assignmentId) return assignment;
              return {
                ...assignment,
                workerId: updatedAssignment.workerId ?? assignment.workerId,
                workerName: updatedAssignment.worker?.name ?? assignment.workerName,
                status: updatedAssignment.status ?? assignment.status,
                startDate: updatedAssignment.startDate ?? assignment.startDate,
                endDate: updatedAssignment.endDate ?? assignment.endDate,
              };
            }),
          })),
        );
      },
      error: () => {
        this.orders.set(previousOrders);
        this.toast.show('Не удалось сохранить', 'error');
      },
    });
  }

  updateLineStatus(orderId: string, lineNo: number, status: ProductionLineStatus): void {
    const previousOrders = this.orders();
    const target = previousOrders.find((order) => order.id === orderId);
    if (!target) return;

    this.orders.set(
      previousOrders.map((order) => {
        if (order.id !== orderId) return order;
        const lines = (order.linesSnapshot ?? []).map((line) =>
          line.lineNo === lineNo ? { ...line, status } : line,
        );
        return { ...order, linesSnapshot: lines };
      }),
    );

    this.http
      .patch(this.endpoint(`/api/production/orders/${orderId}/lines/${lineNo}/status`), { status })
      .subscribe({
        error: () => {
          this.orders.set(previousOrders);
          this.toast.show('Не удалось сохранить', 'error');
        },
      });
  }

  private endpoint(path: string): string {
    return `${this.api.baseUrl.replace(/\/$/, '')}${path}`;
  }

  private resolveStatusUpdateErrorMessage(err: unknown): string {
    const payload =
      typeof err === 'object' && err !== null && 'error' in err
        ? (err as { error?: unknown }).error
        : null;
    const code =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: unknown }).error ?? '')
        : '';
    if (code === 'illegal_status_transition') {
      return 'Нельзя изменить статус этим действием. Перемещайте заказ только по шагам: PENDING -> IN_PROGRESS -> DONE -> SHIPPED.';
    }
    if (code === 'insufficient_permissions') {
      return 'Недостаточно прав для принудительной смены статуса.';
    }
    return 'Не удалось сохранить';
  }
}
