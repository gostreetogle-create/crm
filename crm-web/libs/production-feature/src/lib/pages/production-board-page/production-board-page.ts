import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { API_CONFIG } from '@srm/platform-core';
import { OrderDrawerComponent } from '../../components/order-drawer/order-drawer.component';
import { PositionDrawerComponent } from '../../components/position-drawer/position-drawer.component';
import {
  ProductionGanttComponent,
  type ProductionGanttOrderBarClick,
} from '../../components/production-gantt/production-gantt.component';
import { TeamPanelComponent, type TeamPanelMember } from '../../components/team-panel/team-panel.component';
import {
  PageShellComponent,
  ProductionOrderCardComponent,
  type ProductionOrderCardModel,
  type ProductionOrderCardPositionOpenEvent,
} from '@srm/ui-kit';
import {
  AssignPayload,
  ProductionLineStatus,
  ProductionLineSnapshot,
  ProductionOrder,
  ProductionStatus,
  Worker,
} from '../../production.types';
import { ProductionStore } from '../../state/production.store';

@Component({
  standalone: true,
  selector: 'app-production-board-page',
  imports: [
    DragDropModule,
    PageShellComponent,
    ProductionOrderCardComponent,
    ProductionGanttComponent,
    TeamPanelComponent,
    OrderDrawerComponent,
    PositionDrawerComponent,
  ],
  providers: [ProductionStore],
  templateUrl: './production-board-page.html',
  styleUrl: './production-board-page.scss',
})
export class ProductionBoardPage implements OnInit {
  readonly store = inject(ProductionStore);
  private readonly api = inject(API_CONFIG);
  private readonly router = inject(Router);
  readonly viewMode = signal<'KANBAN' | 'GANTT'>('KANBAN');
  readonly ganttScale = signal<'DAY' | 'WEEK' | 'MONTH'>('WEEK');
  readonly mediaBaseUrl = this.api.baseUrl.replace(/\/$/, '');
  readonly expandedOrders = signal<Record<string, boolean>>({});
  readonly selectedOrder = signal<ProductionOrder | null>(null);
  readonly ganttOrderPopover = signal<{ orderId: string; left: number; top: number } | null>(null);
  readonly selectedPosition = signal<{ orderId: string; lineNo: number } | null>(null);
  readonly positionEditor = signal<{ workerId: string; startDate: string; endDate: string; status: ProductionLineStatus }>({
    workerId: '',
    startDate: '',
    endDate: '',
    status: 'DESIGNING',
  });
  readonly positionSaveState = signal<Record<'status' | 'worker' | 'dates', 'idle' | 'saving' | 'saved'>>({
    status: 'idle',
    worker: 'idle',
    dates: 'idle',
  });
  readonly commentDraft = signal('');
  readonly savingComment = signal(false);
  readonly columns: ProductionStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE', 'SHIPPED'];
  readonly dropListConnections: Record<ProductionStatus, ProductionStatus[]> = {
    PENDING: ['IN_PROGRESS'],
    IN_PROGRESS: ['DONE'],
    DONE: [],
    SHIPPED: [],
  };
  readonly filters = [
    { value: 'ALL', label: 'Все' },
    { value: 'PENDING', label: 'Проектирование' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'DONE', label: 'Готово' },
    { value: 'SHIPPED', label: 'Отгружено' },
  ] as const;

  /** Активная колонка канбана на узких экранах (табы). */
  readonly mobileKanbanTab = signal<ProductionStatus>('PENDING');

  readonly hasData = computed(() => this.store.orders().length > 0);
  readonly teamMembers = computed<TeamPanelMember[]>(() =>
    this.store.workers().map((worker) => this.mapWorkerCard(worker)),
  );
  readonly ganttPopoverOrder = computed(() => {
    const popover = this.ganttOrderPopover();
    if (!popover) return null;
    return this.store.orders().find((order) => order.id === popover.orderId) ?? null;
  });
  private readonly ganttComponent = viewChild(ProductionGanttComponent);

  ngOnInit(): void {
    this.store.loadOrders();
    this.store.loadWorkers();
  }

  setFilter(filter: 'ALL' | ProductionStatus): void {
    this.store.filter.set(filter);
  }

  setMobileKanbanTab(tab: ProductionStatus): void {
    this.mobileKanbanTab.set(tab);
  }

  progressPercent(order: ProductionOrder): number {
    const p = this.store.progress(order);
    if (!p.total) return 0;
    return Math.round((p.done / p.total) * 100);
  }

  toggleOrderLines(orderId: string): void {
    const state = this.expandedOrders();
    this.expandedOrders.set({ ...state, [orderId]: !state[orderId] });
  }

  isOrderExpanded(orderId: string): boolean {
    return !!this.expandedOrders()[orderId];
  }

  openOrderDrawer(orderCard: ProductionOrderCardModel): void {
    this.closeGanttOrderPopover();
    const fullOrder = this.store.orders().find((order) => order.id === orderCard.id);
    this.selectedOrder.set(fullOrder ?? (orderCard as ProductionOrder));
    this.commentDraft.set('');
  }

  closeOrderDrawer(): void {
    this.selectedOrder.set(null);
    this.commentDraft.set('');
  }

  openPositionDrawer(event: ProductionOrderCardPositionOpenEvent): void {
    this.closeGanttOrderPopover();
    const order = this.store.orders().find((item) => item.id === event.orderId);
    if (!order) return;
    const assignment = order.assignments.find((item) => item.lineNo === event.lineNo);
    const fallbackStart = this.toInputDate(order.productionStart);
    const fallbackEnd = this.toInputDate(order.deadline);
    this.selectedPosition.set({ orderId: event.orderId, lineNo: event.lineNo });
    this.positionEditor.set({
      workerId: assignment?.workerId ?? '',
      startDate: this.toInputDate(assignment?.startDate) || fallbackStart,
      endDate: this.toInputDate(assignment?.endDate) || fallbackEnd,
      status: this.lineSnapshotStatus(order, event.lineNo),
    });
  }

  closePositionDrawer(): void {
    this.selectedPosition.set(null);
    this.positionSaveState.set({ status: 'idle', worker: 'idle', dates: 'idle' });
  }

  startOrder(order: ProductionOrder): void {
    if (order.productionStatus === 'PENDING') {
      this.store.updateOrderStatus(order.id, 'IN_PROGRESS');
      this.selectedOrder.set({ ...order, productionStatus: 'IN_PROGRESS' });
    }
  }

  forceChangeOrderStatus(status: ProductionStatus): void {
    const order = this.selectedOrder();
    if (!order) return;
    this.store.updateOrderStatus(order.id, status, { force: true });
    this.selectedOrder.set({ ...order, productionStatus: status });
  }

  shipOrder(order: ProductionOrder): void {
    this.store.shipOrder(order.id);
    this.selectedOrder.set({ ...order, productionStatus: 'SHIPPED' });
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

  ordersByStatus(status: ProductionStatus): ProductionOrder[] {
    switch (status) {
      case 'PENDING':
        return this.store.pendingOrders();
      case 'IN_PROGRESS':
        return this.store.inProgressOrders();
      case 'DONE':
        return this.store.doneOrders();
      case 'SHIPPED':
        return this.store.shippedOrders();
      default:
        return [];
    }
  }

  onDrop(event: CdkDragDrop<ProductionOrder[]>, newColumn: ProductionStatus): void {
    const order = event.item.data as ProductionOrder | undefined;
    if (!order || order.productionStatus === newColumn) return;
    this.store.updateOrderStatus(order.id, newColumn);
  }

  setView(mode: 'KANBAN' | 'GANTT'): void {
    this.viewMode.set(mode);
    if (mode !== 'GANTT') this.closeGanttOrderPopover();
  }

  setGanttScale(scale: 'DAY' | 'WEEK' | 'MONTH'): void {
    this.ganttScale.set(scale);
  }

  scrollGanttToToday(): void {
    this.ganttComponent()?.scrollToToday();
  }

  openGanttOrderPopover(payload: ProductionGanttOrderBarClick): void {
    const margin = 12;
    const width = 420;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const left = Math.min(Math.max(margin, payload.clientX + 14), maxLeft);
    const top = Math.max(margin, payload.clientY + 14);
    this.ganttOrderPopover.set({ orderId: payload.order.id, left, top });
  }

  closeGanttOrderPopover(): void {
    this.ganttOrderPopover.set(null);
  }

  goToOrderFromPopover(order: ProductionOrder): void {
    this.closeGanttOrderPopover();
    this.router.navigate(['/производство', order.id]);
  }

  statusLabel(status: ProductionStatus): string {
    if (status === 'IN_PROGRESS') return 'В работе';
    if (status === 'DONE') return 'Готово';
    if (status === 'SHIPPED') return 'Отгружено';
    return 'Проектирование';
  }

  lineStatusLabel(status: ProductionLineStatus | undefined): string {
    if (status === 'IN_PROGRESS') return 'В работе';
    if (status === 'DONE') return 'Готово';
    return 'Проектирование';
  }

  formatShortDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = this.parseDateSafe(value);
    if (!date) return '—';
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  plannedRangeLabel(order: ProductionOrder): string {
    const start = this.parseDateSafe(order.productionStart);
    const end = this.parseDateSafe(order.deadline);
    if (!start || !end) return '—';
    return `${this.formatShortDate(order.productionStart)} — ${this.formatShortDate(order.deadline)}`;
  }

  actualRangeLabel(order: ProductionOrder): string {
    const dated = order.assignments
      .map((assignment) => ({
        start: this.parseDateSafe(assignment.startDate),
        end: this.parseDateSafe(assignment.endDate),
      }))
      .filter((item): item is { start: Date; end: Date } => !!item.start && !!item.end);
    if (!dated.length) return '—';
    const min = new Date(Math.min(...dated.map((item) => item.start.getTime())));
    const max = new Date(Math.max(...dated.map((item) => item.end.getTime())));
    return `${this.formatShortDate(min.toISOString())} — ${this.formatShortDate(max.toISOString())}`;
  }

  addComment(): void {
    const order = this.selectedOrder();
    const text = this.commentDraft().trim();
    if (!order || !text) return;

    const nowIso = new Date().toISOString();
    const line = `[${nowIso}] ${text}`;
    const existing = order.notes?.trim() ?? '';
    const nextNotes = existing ? `${existing}\n${line}` : line;

    this.savingComment.set(true);
    this.store.updateOrderNotes(order.id, nextNotes);
    this.selectedOrder.set({ ...order, notes: nextNotes });
    this.commentDraft.set('');
    this.savingComment.set(false);
  }

  selectedPositionOrder(): ProductionOrder | null {
    const selected = this.selectedPosition();
    if (!selected) return null;
    return this.store.orders().find((item) => item.id === selected.orderId) ?? null;
  }

  selectedPositionLine(): ProductionLineSnapshot | null {
    const selected = this.selectedPosition();
    const order = this.selectedPositionOrder();
    if (!selected || !order?.linesSnapshot) return null;
    return order.linesSnapshot.find((line) => line.lineNo === selected.lineNo) ?? null;
  }

  selectedPositionAssignment() {
    const selected = this.selectedPosition();
    const order = this.selectedPositionOrder();
    if (!selected || !order) return undefined;
    return order.assignments.find((item) => item.lineNo === selected.lineNo);
  }

  workerLabel(workerId: string): string {
    const w = this.store.workers().find((item) => item.id === workerId);
    if (!w) return workerId;
    if (w.name && w.name.trim()) return w.name;
    const full = [w.lastName, w.firstName, w.patronymic].filter(Boolean).join(' ').trim();
    return full || workerId;
  }

  workerInitials(name: string): string {
    const parts = name
      .split(' ')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!parts.length) return '??';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  savePositionWorker(): void {
    const selected = this.selectedPosition();
    const order = this.selectedPositionOrder();
    const assignment = this.selectedPositionAssignment();
    const editor = this.positionEditor();
    if (!selected || !order || !editor.workerId) return;
    this.markPositionSaving('worker');
    if (assignment) {
      this.store.updateAssignment(assignment.id, { workerId: editor.workerId });
      this.markPositionSaved('worker');
      return;
    }
    if (!editor.startDate || !editor.endDate) return;
    const payload: AssignPayload = {
      lineNo: selected.lineNo,
      workerId: editor.workerId,
      startDate: editor.startDate,
      endDate: editor.endDate,
      status: this.assignmentStatusFromLine(editor.status),
    };
    this.store.assign(order.id, payload);
    this.markPositionSaved('worker');
  }

  savePositionDates(): void {
    const selected = this.selectedPosition();
    const order = this.selectedPositionOrder();
    const assignment = this.selectedPositionAssignment();
    const editor = this.positionEditor();
    if (!selected || !order || !editor.startDate || !editor.endDate) return;
    this.markPositionSaving('dates');
    if (assignment) {
      this.store.updateAssignment(assignment.id, { startDate: editor.startDate, endDate: editor.endDate });
      this.markPositionSaved('dates');
      return;
    }
    if (!editor.workerId) return;
    const payload: AssignPayload = {
      lineNo: selected.lineNo,
      workerId: editor.workerId,
      startDate: editor.startDate,
      endDate: editor.endDate,
      status: this.assignmentStatusFromLine(editor.status),
    };
    this.store.assign(order.id, payload);
    this.markPositionSaved('dates');
  }

  savePositionStatus(): void {
    const selected = this.selectedPosition();
    const order = this.selectedPositionOrder();
    const editor = this.positionEditor();
    if (!selected || !order) return;
    this.markPositionSaving('status');
    this.store.updateLineStatus(order.id, selected.lineNo, editor.status);
    this.markPositionSaved('status');
  }

  onPositionStatusChange(status: ProductionLineStatus): void {
    this.positionEditor.set({ ...this.positionEditor(), status });
    this.savePositionStatus();
  }

  onPositionWorkerChange(workerId: string): void {
    this.positionEditor.set({ ...this.positionEditor(), workerId });
    this.savePositionWorker();
  }

  onPositionStartDateChange(startDate: string): void {
    this.positionEditor.set({ ...this.positionEditor(), startDate });
    this.savePositionDates();
  }

  onPositionEndDateChange(endDate: string): void {
    this.positionEditor.set({ ...this.positionEditor(), endDate });
    this.savePositionDates();
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

  private assignmentStatusFromLine(status: ProductionLineStatus): ProductionStatus {
    if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (status === 'DONE') return 'DONE';
    return 'PENDING';
  }

  private mapWorkerCard(worker: Worker): TeamPanelMember {
    const name = this.workerLabel(worker.id);
    const activeAssignments = this.store
      .orders()
      .flatMap((order) =>
        order.assignments
          .filter((assignment) => assignment.workerId === worker.id && assignment.status !== 'DONE')
          .map((assignment) => ({ order, assignment })),
      );

    if (!activeAssignments.length) {
      return {
        id: worker.id,
        name,
        initials: this.workerInitials(name),
        statusDot: 'free',
        statusText: 'Свободен',
        title: `${name} — свободен`,
        activePositionCount: 0,
      };
    }

    const withEndDate = activeAssignments.filter((item) => this.parseDateSafe(item.assignment.endDate));
    const currentOrder = activeAssignments[0]?.order.orderNumber || '—';

    if (withEndDate.length) {
      const nearest = withEndDate
        .map((item) => ({ ...item, end: this.parseDateSafe(item.assignment.endDate)! }))
        .sort((a, b) => a.end.getTime() - b.end.getTime())[0];
      const endLabel = this.formatLongDate(nearest.end.toISOString());
      return {
        id: worker.id,
        name,
        initials: this.workerInitials(name),
        statusDot: 'busy-soft',
        statusText: `Занят до ${endLabel}`,
        title: `${name} — заказ ${nearest.order.orderNumber}`,
        activePositionCount: activeAssignments.length,
      };
    }

    return {
      id: worker.id,
      name,
      initials: this.workerInitials(name),
      statusDot: 'busy-hard',
      statusText: 'Занят',
      title: `${name} — заказ ${currentOrder}`,
      activePositionCount: activeAssignments.length,
    };
  }

  private parseDateSafe(value: string | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  private markPositionSaving(key: 'status' | 'worker' | 'dates'): void {
    this.positionSaveState.update((state) => ({ ...state, [key]: 'saving' }));
  }

  private markPositionSaved(key: 'status' | 'worker' | 'dates'): void {
    this.positionSaveState.update((state) => ({ ...state, [key]: 'saved' }));
    setTimeout(() => {
      this.positionSaveState.update((state) => (state[key] === 'saved' ? { ...state, [key]: 'idle' } : state));
    }, 1100);
  }
}
