import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { ProductionAssignment, ProductionLineSnapshot, ProductionOrder } from '../../production.types';
import { ProductionStore } from '../../state/production.store';

type GanttScale = 'DAY' | 'WEEK' | 'MONTH';
type TimelineCell = { key: string; start: Date; end: Date; label: string; odd: boolean };
type LineRow = {
  line: ProductionLineSnapshot;
  assignment?: ProductionAssignment;
  assignmentId?: string;
  start?: Date;
  end?: Date;
  leftPx: number;
  widthPx: number;
  fallbackLeftPx: number;
  fallbackWidthPx: number;
  usesInheritedDates: boolean;
};
type OrderRow = {
  order: ProductionOrder;
  start: Date;
  end: Date;
  leftPx: number;
  widthPx: number;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  plannedLeftPx: number;
  plannedWidthPx: number;
  hasPlanned: boolean;
  hasActual: boolean;
  isOverdue: boolean;
  lines: LineRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_COL_PX = 44;
const WEEK_COL_PX = 72;
const MONTH_COL_PX = 96;
export type ProductionGanttOrderBarClick = { order: ProductionOrder; clientX: number; clientY: number };

@Component({
  standalone: true,
  selector: 'app-production-gantt',
  imports: [CommonModule],
  templateUrl: './production-gantt.component.html',
  styleUrl: './production-gantt.component.scss',
})
export class ProductionGanttComponent {
  private readonly store = inject(ProductionStore);

  private readonly scrollHost = viewChild.required<ElementRef<HTMLElement>>('ganttScrollCol');

  readonly orders = input<ProductionOrder[]>([]);
  readonly scale = input<GanttScale>('WEEK');
  readonly scaleChange = output<GanttScale>();
  readonly orderSelected = output<ProductionOrder>();
  readonly orderBarSelected = output<ProductionGanttOrderBarClick>();
  readonly lineSelected = output<{ orderId: string; lineNo: number }>();

  private readonly expanded = signal<Record<string, boolean>>({});
  private readonly dragState = signal<{
    assignmentId: string;
    dx: number;
    mode: 'move' | 'start' | 'end';
  } | null>(null);
  private readonly today = this.startOfDay(new Date());

  readonly range = computed(() => this.buildRange(this.orders()));
  readonly timelineCells = computed(() => this.buildTimelineCells(this.range().start, this.range().end, this.scale()));
  readonly timelineWidthPx = computed(() => {
    const minWidth = this.scale() === 'DAY' ? 640 : 720;
    return Math.max(this.timelineCells().length * this.cellWidthPx(), minWidth);
  });
  readonly todayLeftPx = computed(() => this.offsetPx(this.today));
  readonly rows = computed(() => this.mapRows(this.orders()));

  toggleOrder(orderId: string, event: Event): void {
    event.stopPropagation();
    const state = this.expanded();
    const open = state[orderId];
    this.expanded.set({ ...state, [orderId]: !open });
  }

  isExpanded(orderId: string): boolean {
    const map = this.expanded();
    if (map[orderId] === undefined) return true;
    return !!map[orderId];
  }

  statusLabel(status: ProductionOrder['productionStatus']): string {
    if (status === 'IN_PROGRESS') return 'В работе';
    if (status === 'DONE') return 'Готово';
    return 'Проектирование';
  }

  lineStatusLabel(status: ProductionLineSnapshot['status']): string {
    if (status === 'IN_PROGRESS') return 'В работе';
    if (status === 'DONE') return 'Готово';
    return 'Проектирование';
  }

  lineBarClass(status: ProductionLineSnapshot['status'] | undefined): string {
    if (status === 'IN_PROGRESS') return 'in-progress';
    if (status === 'DONE') return 'done';
    return 'designing';
  }

  orderClass(order: ProductionOrder): string {
    if (order.productionStatus === 'IN_PROGRESS') return 'in-progress';
    if (order.productionStatus === 'DONE') return 'done';
    return 'designing';
  }

  onLabelClick(_event: Event, order: ProductionOrder): void {
    this.orderSelected.emit(order);
  }

  onOrderBarClick(event: MouseEvent, row: OrderRow): void {
    event.stopPropagation();
    this.orderBarSelected.emit({ order: row.order, clientX: event.clientX, clientY: event.clientY });
  }

  orderProgress(order: ProductionOrder): string {
    const p = this.store.progress(order);
    if (!p.total) return '';
    return `${p.done}/${p.total}`;
  }

  onLineClick(orderId: string, lineNo: number): void {
    this.lineSelected.emit({ orderId, lineNo });
  }

  setScale(nextScale: GanttScale): void {
    if (this.scale() === nextScale) return;
    this.scaleChange.emit(nextScale);
  }

  scrollToToday(): void {
    const el = this.scrollHost().nativeElement;
    el.scrollLeft = Math.max(0, this.todayLeftPx() - 100);
  }

  formatRangeShort(start: Date, end: Date): string {
    return `${this.formatShort(this.startOfDay(start))} — ${this.formatShort(this.startOfDay(end))}`;
  }

  daysSpan(start: Date, end: Date): number {
    const s = this.startOfDay(start).getTime();
    const e = this.startOfDay(end).getTime();
    return Math.round((e - s) / DAY_MS);
  }

  orderRangeLabel(row: OrderRow): string {
    if (row.hasPlanned) return this.formatRangeShort(row.plannedStart!, row.plannedEnd!);
    if (row.hasActual) return this.formatRangeShort(row.start, row.end);
    return '—';
  }

  orderDays(row: OrderRow): string {
    if (row.hasPlanned) return String(this.daysSpan(row.plannedStart!, row.plannedEnd!));
    if (row.hasActual) return String(this.daysSpan(row.start, row.end));
    return '—';
  }

  lineRangeLabel(line: LineRow): string {
    if (!line.start || !line.end) return '—';
    return this.formatRangeShort(line.start, line.end);
  }

  lineDays(line: LineRow): string {
    if (!line.start || !line.end) return '—';
    return String(this.daysSpan(line.start, line.end));
  }

  tooltipForOrder(row: OrderRow): string {
    return `${row.order.orderNumber}\n${this.formatDate(row.start)} — ${this.formatDate(row.end)}\n${this.statusLabel(row.order.productionStatus)}`;
  }

  tooltipForLine(line: LineRow): string {
    if (!line.start || !line.end) return '';
    return `${line.line.name}\n${this.formatDate(line.start)} — ${this.formatDate(line.end)}\n${this.lineStatusLabel(line.line.status)}`;
  }

  onBarBodyPointerDown(event: PointerEvent, lineRow: LineRow): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('bar-handle')) return;
    this.beginLineBarDrag(event, lineRow, 'move');
  }

  onResizeStart(event: PointerEvent, lineRow: LineRow, edge: 'start' | 'end'): void {
    this.beginLineBarDrag(event, lineRow, edge);
  }

  barDragOffsetPx(assignmentId: string | undefined): number {
    if (!assignmentId) return 0;
    const state = this.dragState();
    if (!state || state.assignmentId !== assignmentId) return 0;
    const totalPx = this.timelineWidthPx();
    const rangeMs = Math.max(DAY_MS, this.range().end.getTime() - this.range().start.getTime());
    const deltaMs = (state.dx / totalPx) * rangeMs;
    const deltaDays = Math.round(deltaMs / DAY_MS);
    return deltaDays * (totalPx / (rangeMs / DAY_MS));
  }

  barDragWidthDeltaPx(assignmentId: string | undefined, widthPx: number): number {
    if (!assignmentId) return widthPx;
    const state = this.dragState();
    if (!state || state.assignmentId !== assignmentId) return widthPx;
    const offsetPx = this.barDragOffsetPx(assignmentId);
    if (state.mode === 'move') return widthPx;
    if (state.mode === 'start') return widthPx - offsetPx;
    if (state.mode === 'end') return widthPx + offsetPx;
    return widthPx;
  }

  barDragLeftPx(lineRow: LineRow): number {
    const base = lineRow.leftPx;
    const state = this.dragState();
    if (!state || state.assignmentId !== lineRow.assignmentId) return base;
    const offset = this.barDragOffsetPx(lineRow.assignmentId);
    if (state.mode === 'move' || state.mode === 'start') return base + offset;
    return base;
  }

  private beginLineBarDrag(event: PointerEvent, lineRow: LineRow, mode: 'move' | 'start' | 'end'): void {
    const assignmentId = lineRow.assignmentId;
    if (!assignmentId || !lineRow.start || !lineRow.end) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const origStart = this.startOfDay(new Date(lineRow.start.getTime()));
    const origEnd = this.startOfDay(new Date(lineRow.end.getTime()));
    const totalPx = this.timelineWidthPx();
    const rangeStart = this.range().start.getTime();
    const rangeEnd = this.range().end.getTime();
    const rangeMs = Math.max(DAY_MS, rangeEnd - rangeStart);

    const onMove = (ev: PointerEvent): void => {
      ev.preventDefault();
      const dx = ev.clientX - startX;
      this.dragState.set({ assignmentId, dx, mode });
    };
    const finish = (ev: PointerEvent): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      this.dragState.set(null);
      if (ev.type === 'pointercancel') return;
      const dx = ev.clientX - startX;
      if (Math.abs(dx) < 4) return;
      const deltaMs = (dx / totalPx) * rangeMs;
      const deltaDays = Math.round(deltaMs / DAY_MS);
      let newStart = origStart;
      let newEnd = origEnd;
      if (mode === 'move') {
        newStart = this.addDays(origStart, deltaDays);
        newEnd = this.addDays(origEnd, deltaDays);
      } else if (mode === 'start') {
        newStart = this.addDays(origStart, deltaDays);
        newEnd = origEnd;
        if (newStart.getTime() > newEnd.getTime()) {
          newStart = new Date(newEnd.getTime());
        }
      } else {
        newEnd = this.addDays(origEnd, deltaDays);
        newStart = origStart;
        if (newEnd.getTime() < newStart.getTime()) {
          newEnd = new Date(newStart.getTime());
        }
      }
      const clamped = this.clampAssignmentRange(newStart, newEnd);
      this.store.updateAssignment(assignmentId, {
        startDate: this.toIsoDate(clamped.start),
        endDate: this.toIsoDate(clamped.end),
      });
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  }

  /** start <= end, минимум один календарный день (конец не раньше начала). */
  private clampAssignmentRange(start: Date, end: Date): { start: Date; end: Date } {
    const s = this.startOfDay(start);
    const e = this.startOfDay(end);
    if (e.getTime() < s.getTime()) {
      return { start: s, end: new Date(s.getTime()) };
    }
    return { start: s, end: e };
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private mapRows(orders: ProductionOrder[]): OrderRow[] {
    return orders.map((order) => {
      const fallbackStart = this.parseDate(order.createdAt) ?? this.parseDate(order.productionStart) ?? this.today;
      const fallbackEnd = this.parseDate(order.deadline) ?? this.addDays(fallbackStart, 14);
      const lines = (order.linesSnapshot ?? []).map((line) => {
        const assignment = order.assignments.find((item) => item.lineNo === line.lineNo);
        const lineStart = this.parseDate(assignment?.startDate);
        const lineEnd = this.parseDate(assignment?.endDate);
        const effectiveStart = lineStart ?? fallbackStart;
        const effectiveEnd = lineEnd ?? fallbackEnd;
        return {
          line,
          assignment,
          assignmentId: assignment?.id,
          start: effectiveStart,
          end: effectiveEnd,
          leftPx: this.offsetPx(effectiveStart),
          widthPx: this.spanPx(effectiveStart, effectiveEnd),
          fallbackLeftPx: this.offsetPx(fallbackStart),
          fallbackWidthPx: this.spanPx(fallbackStart, fallbackEnd),
          usesInheritedDates: !(lineStart && lineEnd),
        };
      });
      const datedLines = lines.filter((line) => !line.usesInheritedDates && line.start && line.end);
      const start = datedLines.length
        ? new Date(Math.min(...datedLines.map((line) => line.start!.getTime())))
        : fallbackStart;
      const end = datedLines.length
        ? new Date(Math.max(...datedLines.map((line) => line.end!.getTime())))
        : fallbackEnd;
      const plannedStart = this.parseDate(order.productionStart) ?? null;
      const plannedEnd = this.parseDate(order.deadline) ?? null;
      const hasPlanned = !!(plannedStart && plannedEnd);
      const hasActual = datedLines.length > 0;
      const deadline = this.parseDate(order.deadline);
      const isOverdue =
        !!deadline &&
        this.startOfDay(deadline).getTime() < this.today.getTime() &&
        order.productionStatus !== 'DONE';
      return {
        order,
        start,
        end,
        leftPx: this.offsetPx(start),
        widthPx: this.spanPx(start, end),
        plannedStart,
        plannedEnd,
        plannedLeftPx: hasPlanned ? this.offsetPx(plannedStart!) : 0,
        plannedWidthPx: hasPlanned ? this.spanPx(plannedStart!, plannedEnd!) : 0,
        hasPlanned,
        hasActual,
        isOverdue,
        lines,
      };
    });
  }

  private buildRange(orders: ProductionOrder[]): { start: Date; end: Date } {
    const scale = this.scale();
    if (scale === 'DAY') {
      const baselineStart = this.startOfDay(this.addDays(this.today, -30));
      const baselineEnd = this.startOfDay(this.addDays(this.today, 30));
      const dataBounds = this.collectDataBounds(orders);
      if (!dataBounds) {
        return { start: baselineStart, end: baselineEnd };
      }
      const dataStart = dataBounds.start;
      const dataEndWithBuffer = this.startOfDay(this.addDays(dataBounds.end, 7));
      const baselineSpan = baselineEnd.getTime() - baselineStart.getTime();
      const dataSpan = dataEndWithBuffer.getTime() - dataStart.getTime();
      if (dataSpan > baselineSpan) {
        return { start: dataStart, end: dataEndWithBuffer };
      }
      return { start: baselineStart, end: baselineEnd };
    }
    if (scale === 'WEEK') {
      const start = this.startOfWeek(this.addDays(this.today, -7));
      const end = this.endOfWeek(this.addDays(start, 7 * 12 - 1));
      return { start, end };
    }
    if (scale === 'MONTH') {
      const start = this.startOfMonth(this.addMonths(this.today, -2));
      return { start, end: this.endOfMonth(this.addMonths(start, 11)) };
    }
    const fallbackStart = this.startOfWeek(this.addDays(this.today, -7));
    return { start: fallbackStart, end: this.endOfWeek(this.addDays(fallbackStart, 7 * 12 - 1)) };
  }

  private collectDataBounds(orders: ProductionOrder[]): { start: Date; end: Date } | null {
    const starts: Date[] = [];
    const ends: Date[] = [];

    for (const order of orders) {
      const orderStart = this.parseDate(order.productionStart) ?? this.parseDate(order.createdAt);
      const orderEnd = this.parseDate(order.deadline);
      if (orderStart) starts.push(orderStart);
      if (orderEnd) ends.push(orderEnd);
      for (const assignment of order.assignments) {
        const lineStart = this.parseDate(assignment.startDate);
        const lineEnd = this.parseDate(assignment.endDate);
        if (lineStart) starts.push(lineStart);
        if (lineEnd) ends.push(lineEnd);
      }
    }

    if (!starts.length && !ends.length) return null;
    const minStart = starts.length
      ? new Date(Math.min(...starts.map((date) => date.getTime())))
      : this.startOfDay(this.today);
    const maxEnd = ends.length
      ? new Date(Math.max(...ends.map((date) => date.getTime())))
      : new Date(Math.max(...starts.map((date) => date.getTime())));
    return {
      start: this.startOfDay(minStart),
      end: this.startOfDay(maxEnd),
    };
  }

  private buildTimelineCells(start: Date, end: Date, scale: GanttScale): TimelineCell[] {
    if (scale === 'DAY') return this.buildDayCells(start, end);
    if (scale === 'MONTH') return this.buildMonthCells(start, end);
    return this.buildWeekCells(start, end);
  }

  private buildDayCells(start: Date, end: Date): TimelineCell[] {
    const days: TimelineCell[] = [];
    const cursor = this.startOfDay(start);
    let index = 0;
    while (cursor <= end) {
      const dayStart = this.startOfDay(cursor);
      const dayEnd = this.startOfDay(cursor);
      days.push({
        key: `d-${dayStart.getTime()}`,
        start: dayStart,
        end: dayEnd,
        label: String(dayStart.getDate()),
        odd: index % 2 === 1,
      });
      cursor.setDate(cursor.getDate() + 1);
      index += 1;
    }
    return days;
  }

  private buildWeekCells(start: Date, end: Date): TimelineCell[] {
    const weeks: TimelineCell[] = [];
    const cursor = this.startOfWeek(start);
    let index = 0;
    while (cursor <= end) {
      const weekStart = this.startOfWeek(cursor);
      const weekEnd = this.endOfWeek(weekStart);
      weeks.push({
        key: `w-${weekStart.getTime()}`,
        start: weekStart,
        end: weekEnd,
        label: String(weekStart.getDate()),
        odd: index % 2 === 1,
      });
      cursor.setDate(cursor.getDate() + 7);
      index += 1;
    }
    return weeks;
  }

  private buildMonthCells(start: Date, end: Date): TimelineCell[] {
    const months: TimelineCell[] = [];
    const cursor = this.startOfMonth(start);
    let index = 0;
    while (cursor <= end) {
      const monthStart = this.startOfMonth(cursor);
      const monthEnd = this.endOfMonth(monthStart);
      months.push({
        key: `m-${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`,
        start: monthStart,
        end: monthEnd,
        label: this.formatMonth(monthStart),
        odd: index % 2 === 1,
      });
      cursor.setMonth(cursor.getMonth() + 1);
      index += 1;
    }
    return months;
  }

  private offsetPx(date: Date): number {
    const diffDays = Math.max(0, (this.startOfDay(date).getTime() - this.range().start.getTime()) / DAY_MS);
    const totalDays = Math.max(1, (this.range().end.getTime() - this.range().start.getTime()) / DAY_MS);
    return (diffDays / totalDays) * this.timelineWidthPx();
  }

  private spanPx(start: Date, end: Date): number {
    const totalDays = Math.max(1, (this.range().end.getTime() - this.range().start.getTime()) / DAY_MS);
    const spanDays = Math.max(1, (this.startOfDay(end).getTime() - this.startOfDay(start).getTime()) / DAY_MS + 1);
    return Math.max(12, (spanDays / totalDays) * this.timelineWidthPx());
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = isoDate.exec(value.trim());
    const date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return this.startOfDay(date);
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfWeek(date: Date): Date {
    const d = this.startOfDay(date);
    const day = d.getDay();
    const delta = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + delta);
    return d;
  }

  private endOfWeek(date: Date): Date {
    const start = this.startOfWeek(date);
    return this.addDays(start, 6);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  private addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  private addMonths(base: Date, months: number): Date {
    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  private formatShort(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date);
  }

  private formatMonth(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' }).format(date);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  cellWidthPx(): number {
    if (this.scale() === 'DAY') return DAY_COL_PX;
    if (this.scale() === 'MONTH') return MONTH_COL_PX;
    return WEEK_COL_PX;
  }
}
