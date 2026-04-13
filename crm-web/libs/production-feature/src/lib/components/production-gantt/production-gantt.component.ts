import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { ProductionAssignment, ProductionLineSnapshot, ProductionOrder } from '../../production.types';
import { ProductionStore } from '../../state/production.store';

type WeekCell = { key: string; start: Date; end: Date; label: string; odd: boolean };
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
};
type OrderRow = {
  order: ProductionOrder;
  start: Date;
  end: Date;
  leftPx: number;
  widthPx: number;
  lines: LineRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_COL_PX = 72;

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
  readonly orderSelected = output<ProductionOrder>();
  readonly lineSelected = output<{ orderId: string; lineNo: number }>();

  private readonly expanded = signal<Record<string, boolean>>({});
  private readonly today = this.startOfDay(new Date());

  readonly range = computed(() => this.buildRange(this.orders()));
  readonly weekCells = computed(() => this.buildWeeks(this.range().start, this.range().end));
  readonly timelineWidthPx = computed(() => Math.max(this.weekCells().length * WEEK_COL_PX, 720));
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

  onLineClick(orderId: string, lineNo: number): void {
    this.lineSelected.emit({ orderId, lineNo });
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
    return this.formatRangeShort(row.start, row.end);
  }

  orderDays(row: OrderRow): string {
    return String(this.daysSpan(row.start, row.end));
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
    };
    const onUp = (ev: PointerEvent): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
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
    document.addEventListener('pointerup', onUp);
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
    return d.toISOString().slice(0, 10);
  }

  private mapRows(orders: ProductionOrder[]): OrderRow[] {
    return orders.map((order) => {
      const fallbackStart = this.parseDate(order.createdAt) ?? this.parseDate(order.productionStart) ?? this.today;
      const fallbackEnd = this.parseDate(order.deadline) ?? this.addDays(fallbackStart, 14);
      const lines = (order.linesSnapshot ?? []).map((line) => {
        const assignment = order.assignments.find((item) => item.lineNo === line.lineNo);
        const lineStart = this.parseDate(assignment?.startDate);
        const lineEnd = this.parseDate(assignment?.endDate);
        return {
          line,
          assignment,
          assignmentId: assignment?.id,
          start: lineStart ?? undefined,
          end: lineEnd ?? undefined,
          leftPx: lineStart ? this.offsetPx(lineStart) : 0,
          widthPx: lineStart && lineEnd ? this.spanPx(lineStart, lineEnd) : 0,
          fallbackLeftPx: this.offsetPx(fallbackStart),
          fallbackWidthPx: this.spanPx(fallbackStart, fallbackEnd),
        };
      });
      const datedLines = lines.filter((line) => line.start && line.end);
      const start = datedLines.length
        ? new Date(Math.min(...datedLines.map((line) => line.start!.getTime())))
        : fallbackStart;
      const end = datedLines.length
        ? new Date(Math.max(...datedLines.map((line) => line.end!.getTime())))
        : fallbackEnd;
      return {
        order,
        start,
        end,
        leftPx: this.offsetPx(start),
        widthPx: this.spanPx(start, end),
        lines,
      };
    });
  }

  private buildRange(orders: ProductionOrder[]): { start: Date; end: Date } {
    if (!orders.length) {
      const start = this.startOfWeek(this.addDays(this.today, -7));
      return { start, end: this.endOfWeek(this.addDays(start, 35)) };
    }
    const starts = orders
      .map((order) => this.parseDate(order.createdAt) ?? this.parseDate(order.productionStart))
      .filter((d): d is Date => !!d);
    const ends = orders.map((order) => this.parseDate(order.deadline)).filter((d): d is Date => !!d);
    const min = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : this.today;
    const max = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : this.addDays(min, 14);
    return {
      start: this.startOfWeek(min),
      end: this.endOfWeek(this.addDays(max, 14)),
    };
  }

  private buildWeeks(start: Date, end: Date): WeekCell[] {
    const weeks: WeekCell[] = [];
    const cursor = new Date(start);
    let index = 0;
    while (cursor <= end) {
      const weekStart = this.startOfWeek(cursor);
      const weekEnd = this.endOfWeek(weekStart);
      weeks.push({
        key: `w-${weekStart.getTime()}`,
        start: weekStart,
        end: weekEnd,
        label: `${this.formatShort(weekStart)} - ${this.formatShort(weekEnd)}`,
        odd: index % 2 === 1,
      });
      cursor.setDate(cursor.getDate() + 7);
      index += 1;
    }
    return weeks;
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
    const date = new Date(value);
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

  private addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  private formatShort(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }
}
