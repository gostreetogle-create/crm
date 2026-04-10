import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProductionLineSnapshot, ProductionOrder } from '../../production.types';
import { ProductionStore } from '../../state/production.store';

type GanttViewMode = 'day' | 'week' | 'month';
type DragMode = 'move' | 'resize';

type TimelineRange = { start: Date; end: Date };

type UnitCell = {
  key: string;
  label: string;
  isCurrent: boolean;
};

type SourceRow = {
  id: string;
  orderNumber: string;
  customerLabel: string;
  title: string;
  status: ProductionOrder['productionStatus'];
  statusClass: 'pending' | 'in-progress' | 'done';
  start: Date;
  end: Date;
  done: number;
  total: number;
  lines: PopupLine[];
};

type GanttRow = SourceRow & {
  left: number;
  width: number;
};

type PopupLine = {
  title: string;
  quantity: number | null;
};

type DragState = {
  mode: DragMode;
  rowId: string;
  startX: number;
  initialStart: Date;
  initialEnd: Date;
  trackWidth: number;
  totalDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  standalone: true,
  selector: 'app-production-gantt',
  imports: [CommonModule],
  template: `
    <section class="ganttRoot">
      <div class="ganttToolbar">
        <button type="button" class="modeBtn" [class.modeBtn--active]="viewMode() === 'day'" (click)="setMode('day')">
          День
        </button>
        <button type="button" class="modeBtn" [class.modeBtn--active]="viewMode() === 'week'" (click)="setMode('week')">
          Неделя
        </button>
        <button
          type="button"
          class="modeBtn"
          [class.modeBtn--active]="viewMode() === 'month'"
          (click)="setMode('month')"
        >
          Месяц
        </button>
      </div>

      @if (!orders().length) {
        <p class="emptyState">Нет заказов для отображения</p>
      } @else {
        <div id="gantt-here" class="ganttHost">
          <div class="timelineHeader">
            <div class="leftStub"></div>
            <div class="unitsGrid" [style.grid-template-columns]="unitsTemplate()">
              @for (unit of units(); track unit.key) {
                <div class="unitCell" [class.unitCell--current]="unit.isCurrent">
                  {{ unit.label }}
                </div>
              }
            </div>
          </div>

          <div class="rows">
            @for (row of rows(); track row.id) {
              <div class="row">
                <div class="rowInfo">
                  <span class="rowInfoText">{{ row.title }}</span>
                </div>

                <div class="rowTrack" #track [style.grid-template-columns]="unitsTemplate()">
                  @for (unit of units(); track unit.key) {
                    <div class="unitStripe" [class.unitStripe--current]="unit.isCurrent"></div>
                  }

                  <button
                    type="button"
                    class="bar"
                    [class.bar--pending]="row.statusClass === 'pending'"
                    [class.bar--in-progress]="row.statusClass === 'in-progress'"
                    [class.bar--done]="row.statusClass === 'done'"
                    [style.left.%]="row.left"
                    [style.width.%]="row.width"
                    (click)="onBarClick($event, row)"
                    (mousedown)="startMove($event, row, track)"
                  >
                    <span class="barLabel">{{ row.orderNumber }}</span>
                    <span class="barResizeHandle" (click)="$event.stopPropagation()" (mousedown)="startResize($event, row, track)"></span>
                  </button>

                  @if (selectedOrderId() === row.id) {
                    <div class="barPopup" [style.left.%]="popupLeftPercent(row)" (click)="$event.stopPropagation()">
                      <div class="popupHeader">
                        <strong>{{ row.orderNumber }} {{ row.customerLabel || '' }}</strong>
                        <button type="button" class="popupClose" (click)="closePopup()">✕</button>
                      </div>
                      <div class="popupStatus" [class]="'popupStatus popupStatus--' + row.statusClass">
                        {{ statusLabel(row.status) }}
                      </div>
                      <label class="popupField">
                        <span>Начало</span>
                        <input type="date" [value]="popupStartDate()" (input)="onPopupStartInput($event)" />
                      </label>
                      <label class="popupField">
                        <span>Конец</span>
                        <input type="date" [value]="popupEndDate()" (input)="onPopupEndInput($event)" />
                      </label>
                      <div class="popupSection">
                        <strong>Состав заказа</strong>
                        @if (row.lines.length) {
                          <div class="popupLines">
                            @for (line of row.lines; track $index) {
                              <div class="popupLineItem">
                                <span class="popupLineTitle">{{ line.title }}</span>
                                <span class="popupLineQty">
                                  @if (line.quantity !== null) {
                                    {{ line.quantity }}
                                  } @else {
                                    —
                                  }
                                </span>
                              </div>
                            }
                          </div>
                        } @else {
                          <div class="popupMuted">Позиции не указаны</div>
                        }
                      </div>
                      <div class="popupProgress">Прогресс: {{ row.done }} из {{ row.total }} позиций</div>
                      <div class="popupActions">
                        <button type="button" class="popupBtn popupBtn--primary" (click)="savePopup()">Сохранить</button>
                        <button type="button" class="popupBtn" (click)="openOrder(row.id)">Открыть заказ</button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .ganttRoot {
      display: grid;
      gap: 12px;
    }
    .ganttToolbar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .modeBtn {
      border: 1px solid var(--border-color);
      background: var(--surface);
      color: var(--text-primary);
      border-radius: var(--radius-pill);
      padding: 6px 12px;
      cursor: pointer;
    }
    .modeBtn--active {
      border-color: var(--accent);
      background: var(--surface-soft);
    }
    .ganttHost {
      min-height: 240px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      background: #fff;
      color: #333;
      overflow: auto;
      padding: 10px;
      user-select: none;
    }
    .emptyState {
      margin: 0;
      color: var(--text-muted);
    }
    .timelineHeader,
    .row {
      display: grid;
      grid-template-columns: 200px minmax(640px, 1fr);
      gap: 8px;
    }
    .leftStub {
      min-height: 34px;
    }
    .unitsGrid {
      display: grid;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .unitCell {
      font-size: 12px;
      padding: 8px;
      border-right: 1px solid var(--border-color);
      background: #fff;
      white-space: nowrap;
    }
    .unitCell:last-child {
      border-right: none;
    }
    .unitCell--current {
      background: color-mix(in srgb, var(--accent) 12%, #ffffff);
    }
    .rows {
      display: grid;
      gap: 8px;
      margin-top: 8px;
    }
    .rowInfo {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: #fff;
      text-align: left;
      padding: 8px;
      min-height: 46px;
      display: flex;
      align-items: center;
    }
    .rowInfoText {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.2;
      font-size: 12px;
      word-break: break-word;
    }
    .rowTrack {
      position: relative;
      display: grid;
      align-items: center;
      min-height: 46px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: visible;
      background: #fff;
    }
    .unitStripe {
      align-self: stretch;
      border-right: 1px solid color-mix(in srgb, var(--border-color) 82%, #fff);
    }
    .unitStripe--current {
      background: color-mix(in srgb, var(--accent) 8%, #fff);
    }
    .bar {
      position: absolute;
      top: 8px;
      bottom: 8px;
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      text-align: left;
      padding: 0 18px 0 8px;
      cursor: grab;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .bar--pending {
      background: #8f8f8f;
    }
    .bar--in-progress {
      background: #2877ff;
    }
    .bar--done {
      background: #29a34a;
    }
    .barLabel {
      line-height: 30px;
    }
    .barResizeHandle {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 8px;
      cursor: col-resize;
      background: color-mix(in srgb, #000 20%, transparent);
    }
    .barPopup {
      position: absolute;
      top: 42px;
      z-index: 5;
      width: 300px;
      min-width: 280px;
      max-width: calc(100% - 8px);
      max-height: 320px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
      padding: 10px;
      display: grid;
      gap: 8px;
    }
    .popupHeader {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      font-size: 13px;
    }
    .popupClose {
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 15px;
      line-height: 1;
    }
    .popupStatus {
      width: fit-content;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
    }
    .popupStatus--pending {
      background: #8f8f8f;
    }
    .popupStatus--in-progress {
      background: #2877ff;
    }
    .popupStatus--done {
      background: #29a34a;
    }
    .popupField {
      display: grid;
      gap: 4px;
      font-size: 12px;
    }
    .popupField input {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 5px 7px;
    }
    .popupProgress {
      font-size: 12px;
      color: var(--text-muted);
    }
    .popupSection {
      display: grid;
      gap: 4px;
      font-size: 12px;
    }
    .popupLines {
      display: grid;
      gap: 2px;
    }
    .popupLineItem {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
    }
    .popupLineTitle {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .popupLineQty {
      color: var(--text-muted);
    }
    .popupMuted {
      color: var(--text-muted);
    }
    .popupActions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .popupBtn {
      border: 1px solid var(--border-color);
      background: #fff;
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 12px;
    }
    .popupBtn--primary {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 10%, #fff);
    }
  `,
})
export class ProductionGanttComponent {
  private readonly router = inject(Router);
  private readonly store = inject(ProductionStore);
  private readonly currentDate = new Date();

  readonly orders = input<ProductionOrder[]>([]);
  readonly viewMode = signal<GanttViewMode>('week');
  readonly selectedOrderId = signal<string | null>(null);
  readonly popupStartDate = signal('');
  readonly popupEndDate = signal('');
  readonly localDates = signal<Record<string, { start: Date; end: Date }>>({});

  private dragState: DragState | null = null;

  readonly sourceRows = computed(() => this.mapSourceRows(this.orders(), this.localDates()));
  readonly range = computed(() => this.buildRange(this.sourceRows(), this.viewMode()));
  readonly units = computed(() => this.buildUnits(this.range(), this.viewMode()));
  readonly rows = computed(() => this.mapRows(this.sourceRows(), this.range(), this.viewMode()));
  readonly unitsTemplate = computed(() => `repeat(${Math.max(this.units().length, 1)}, minmax(80px, 1fr))`);

  setMode(mode: GanttViewMode): void {
    this.viewMode.set(mode);
  }

  openOrder(id: string): void {
    this.router.navigate(['/производство', id]);
  }

  onBarClick(event: MouseEvent, row: GanttRow): void {
    event.stopPropagation();
    const next = this.selectedOrderId() === row.id ? null : row.id;
    this.selectedOrderId.set(next);
    if (!next) return;
    this.popupStartDate.set(this.toInputDate(row.start));
    this.popupEndDate.set(this.toInputDate(row.end));
  }

  closePopup(): void {
    this.selectedOrderId.set(null);
  }

  savePopup(): void {
    const id = this.selectedOrderId();
    if (!id) return;
    const start = this.parseInputDate(this.popupStartDate());
    const end = this.parseInputDate(this.popupEndDate());
    if (!start || !end || end.getTime() < start.getTime()) return;
    this.commitSchedule(id, start, end);
    this.closePopup();
  }

  onPopupStartInput(event: Event): void {
    this.popupStartDate.set((event.target as HTMLInputElement).value);
  }

  onPopupEndInput(event: Event): void {
    this.popupEndDate.set((event.target as HTMLInputElement).value);
  }

  startMove(event: MouseEvent, row: GanttRow, track: HTMLElement): void {
    if ((event.target as HTMLElement).closest('.barResizeHandle')) return;
    event.preventDefault();
    event.stopPropagation();
    this.dragState = this.createDragState('move', event, row, track);
  }

  startResize(event: MouseEvent, row: GanttRow, track: HTMLElement): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragState = this.createDragState('resize', event, row, track);
  }

  popupLeftPercent(row: GanttRow): number {
    const defaultLeft = row.left;
    const overflowRight = defaultLeft + row.width > 80;
    if (!overflowRight) return this.clamp(defaultLeft, 0, 72);
    return this.clamp(defaultLeft - 32, 2, 72);
  }

  statusLabel(status: ProductionOrder['productionStatus']): string {
    switch (status) {
      case 'IN_PROGRESS':
        return 'В работе';
      case 'DONE':
        return 'Готово';
      default:
        return 'Ожидает';
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.dragState) return;
    const deltaX = event.clientX - this.dragState.startX;
    const pxPerDay = this.dragState.trackWidth / this.dragState.totalDays;
    const dayShift = Math.round(deltaX / Math.max(pxPerDay, 1));
    const shiftedStart = this.addDays(this.dragState.initialStart, dayShift);
    const shiftedEnd = this.addDays(this.dragState.initialEnd, dayShift);

    if (this.dragState.mode === 'move') {
      this.applyLocalDates(this.dragState.rowId, shiftedStart, shiftedEnd);
    } else {
      const nextEnd = shiftedEnd.getTime() < this.dragState.initialStart.getTime() ? this.dragState.initialStart : shiftedEnd;
      this.applyLocalDates(this.dragState.rowId, this.dragState.initialStart, nextEnd);
    }
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (!this.dragState) return;
    const row = this.rows().find((item) => item.id === this.dragState?.rowId);
    this.dragState = null;
    if (!row) return;
    this.commitSchedule(row.id, row.start, row.end);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.selectedOrderId()) return;
    const target = event.target as HTMLElement;
    if (target.closest('.barPopup') || target.closest('.bar')) return;
    this.closePopup();
  }

  private createDragState(mode: DragMode, event: MouseEvent, row: GanttRow, track: HTMLElement): DragState {
    const range = this.range();
    const totalDays = Math.max((range.end.getTime() - range.start.getTime()) / DAY_MS, 1);
    return {
      mode,
      rowId: row.id,
      startX: event.clientX,
      initialStart: row.start,
      initialEnd: row.end,
      trackWidth: Math.max(track.clientWidth, 1),
      totalDays,
    };
  }

  private applyLocalDates(id: string, start: Date, end: Date): void {
    this.localDates.update((state) => ({ ...state, [id]: { start: new Date(start), end: new Date(end) } }));
    if (this.selectedOrderId() === id) {
      this.popupStartDate.set(this.toInputDate(start));
      this.popupEndDate.set(this.toInputDate(end));
    }
  }

  private commitSchedule(id: string, start: Date, end: Date): void {
    this.store.updateOrderSchedule(id, start.toISOString(), end.toISOString());
    this.localDates.update((state) => {
      const next = { ...state };
      delete next[id];
      return next;
    });
  }

  private mapSourceRows(orders: ProductionOrder[], localDates: Record<string, { start: Date; end: Date }>): SourceRow[] {
    return orders.map((order) => {
      const initialStart = this.parseDate(order.productionStart ?? order.createdAt) ?? this.currentDate;
      const initialEnd = this.parseDate(order.deadline) ?? this.addDays(initialStart, 30);
      const draft = localDates[order.id];
      const start = draft?.start ?? initialStart;
      const end = draft?.end ?? initialEnd;
      const total = order.assignments?.length ?? 0;
      const done = (order.assignments ?? []).filter((item) => item.status === 'DONE').length;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerLabel: order.customerLabel || '',
        title: `${order.orderNumber} ${order.customerLabel || ''}`.trim(),
        status: order.productionStatus,
        statusClass: this.statusClass(order.productionStatus),
        start,
        end,
        done,
        total,
        lines: this.mapPopupLines(order.linesSnapshot),
      };
    });
  }

  private mapPopupLines(linesSnapshot: ProductionLineSnapshot[] | undefined): PopupLine[] {
    if (!Array.isArray(linesSnapshot) || linesSnapshot.length === 0) return [];
    return linesSnapshot.map((line) => {
      const raw = line as ProductionLineSnapshot & { quantity?: number; title?: string };
      return {
        title: String(raw.title || raw.name || 'Без названия'),
        quantity: typeof raw.quantity === 'number' ? raw.quantity : (typeof raw.qty === 'number' ? raw.qty : null),
      };
    });
  }

  private mapRows(sourceRows: SourceRow[], range: TimelineRange, mode: GanttViewMode): GanttRow[] {
    const rangeStart = this.metricValue(range.start, mode);
    const rangeEnd = this.metricValue(range.end, mode);
    const total = Math.max(rangeEnd - rangeStart, 1);

    return sourceRows.map((row) => {
      const start = this.metricValue(row.start, mode);
      const end = this.metricValue(row.end, mode);
      const left = ((start - rangeStart) / total) * 100;
      const width = Math.max(2, ((end - start) / total) * 100);
      return {
        ...row,
        left: this.clamp(left, 0, 100),
        width: this.clamp(width, 2, 100),
      };
    });
  }

  private buildRange(rows: SourceRow[], mode: GanttViewMode): TimelineRange {
    if (mode === 'day') {
      const base = this.startOfDay(this.currentDate);
      return {
        start: this.addDays(base, -14),
        end: this.addDays(base, 15),
      };
    }

    if (mode === 'month') {
      const base = this.startOfMonth(this.currentDate);
      return {
        start: this.addMonths(base, -3),
        end: this.addMonths(base, 4),
      };
    }

    if (!rows.length) {
      const start = this.addDays(this.startOfWeek(this.currentDate), -7);
      return { start, end: this.addDays(start, 7 * 6) };
    }

    const min = new Date(Math.min(...rows.map((row) => row.start.getTime())));
    const max = new Date(Math.max(...rows.map((row) => row.end.getTime())));
    return {
      start: this.addDays(this.startOfWeek(min), -7),
      end: this.addDays(this.startOfWeek(max), 7 * 3),
    };
  }

  private buildUnits(range: TimelineRange, mode: GanttViewMode): UnitCell[] {
    if (mode === 'day') return this.buildDayUnits(range);
    if (mode === 'month') return this.buildMonthUnits(range);
    return this.buildWeekUnits(range);
  }

  private buildDayUnits(range: TimelineRange): UnitCell[] {
    const items: UnitCell[] = [];
    const today = this.startOfDay(this.currentDate).getTime();
    const cursor = new Date(range.start);
    while (cursor < range.end) {
      const start = new Date(cursor);
      items.push({
        key: `d-${start.getTime()}`,
        label: this.formatDayMonth(start),
        isCurrent: start.getTime() === today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return items;
  }

  private buildWeekUnits(range: TimelineRange): UnitCell[] {
    const items: UnitCell[] = [];
    const nowWeek = this.startOfWeek(this.currentDate).getTime();
    const cursor = new Date(range.start);
    while (cursor < range.end) {
      const weekStart = new Date(cursor);
      const weekEnd = this.addDays(weekStart, 6);
      items.push({
        key: `w-${weekStart.getTime()}`,
        label: `${this.formatDayMonth(weekStart)} — ${this.formatDayMonth(weekEnd)}`,
        isCurrent: weekStart.getTime() === nowWeek,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
    return items;
  }

  private buildMonthUnits(range: TimelineRange): UnitCell[] {
    const items: UnitCell[] = [];
    const nowMonth = this.startOfMonth(this.currentDate).getTime();
    const cursor = new Date(range.start);
    while (cursor < range.end) {
      const monthStart = this.startOfMonth(cursor);
      items.push({
        key: `m-${monthStart.getTime()}`,
        label: this.formatMonthYear(monthStart),
        isCurrent: monthStart.getTime() === nowMonth,
      });
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
    }
    return items;
  }

  private metricValue(date: Date, mode: GanttViewMode): number {
    if (mode !== 'month') return date.getTime() / DAY_MS;
    const monthStart = this.startOfMonth(date);
    const monthIndex = monthStart.getFullYear() * 12 + monthStart.getMonth();
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    return monthIndex + (date.getDate() - 1) / Math.max(daysInMonth, 1);
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfWeek(date: Date): Date {
    const result = this.startOfDay(date);
    const day = result.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + offset);
    return result;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private formatDayMonth(date: Date): string {
    const formatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' });
    return formatter.format(date).replace('.', '');
  }

  private formatMonthYear(date: Date): string {
    const raw = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseInputDate(value: string): Date | null {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private addDays(base: Date, days: number): Date {
    const date = new Date(base);
    date.setDate(date.getDate() + days);
    return date;
  }

  private addMonths(base: Date, months: number): Date {
    const date = new Date(base);
    date.setMonth(date.getMonth() + months, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private statusClass(status: ProductionOrder['productionStatus']): 'pending' | 'in-progress' | 'done' {
    switch (status) {
      case 'IN_PROGRESS':
        return 'in-progress';
      case 'DONE':
        return 'done';
      default:
        return 'pending';
    }
  }
}
