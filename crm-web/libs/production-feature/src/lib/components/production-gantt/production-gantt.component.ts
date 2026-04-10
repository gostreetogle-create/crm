import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import Gantt from 'frappe-gantt';
import { ProductionOrder } from '../../production.types';

type GanttViewMode = 'Day' | 'Week' | 'Month';

type GanttTaskModel = {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  custom_class: 'pending' | 'in-progress' | 'done';
};

@Component({
  standalone: true,
  selector: 'app-production-gantt',
  imports: [CommonModule],
  template: `
    <section class="ganttRoot">
      <div class="ganttToolbar">
        <button type="button" class="modeBtn" [class.modeBtn--active]="viewMode() === 'Day'" (click)="setMode('Day')">
          День
        </button>
        <button
          type="button"
          class="modeBtn"
          [class.modeBtn--active]="viewMode() === 'Week'"
          (click)="setMode('Week')"
        >
          Неделя
        </button>
        <button
          type="button"
          class="modeBtn"
          [class.modeBtn--active]="viewMode() === 'Month'"
          (click)="setMode('Month')"
        >
          Месяц
        </button>
      </div>
      <div #ganttHost class="ganttHost"></div>
    </section>
  `,
  styles: `
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
      min-height: 420px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      background: var(--surface);
      overflow: auto;
      padding: 8px;
    }

    :host ::ng-deep .gantt .bar-wrapper.pending .bar-progress {
      fill: #b5b5b5;
    }

    :host ::ng-deep .gantt .bar-wrapper.in-progress .bar-progress {
      fill: #2877ff;
    }

    :host ::ng-deep .gantt .bar-wrapper.done .bar-progress {
      fill: #29a34a;
    }
  `,
})
export class ProductionGanttComponent implements AfterViewInit, OnChanges, OnDestroy {
  private gantt: Gantt | null = null;

  readonly orders = input<ProductionOrder[]>([]);
  readonly dateChange = output<{ id: string; productionStart: string; deadline: string }>();
  readonly taskClick = output<string>();
  readonly viewMode = signal<GanttViewMode>('Week');

  @ViewChild('ganttHost', { static: true }) private readonly host!: ElementRef<HTMLDivElement>;

  private readonly modeEffect = effect(() => {
    if (!this.gantt) return;
    this.gantt.change_view_mode(this.viewMode());
  });

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['orders'] && this.host) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.modeEffect.destroy();
  }

  setMode(mode: GanttViewMode): void {
    this.viewMode.set(mode);
  }

  private render(): void {
    const tasks = this.orders().map((order) => this.toTask(order));
    this.host.nativeElement.innerHTML = '';
    this.gantt = new Gantt(this.host.nativeElement, tasks, {
      view_mode: this.viewMode(),
      language: 'ru',
      on_date_change: (task, start, end) => {
        this.dateChange.emit({
          id: task.id,
          productionStart: start.toISOString(),
          deadline: end.toISOString(),
        });
      },
      on_click: (task) => this.taskClick.emit(task.id),
    });
  }

  private toTask(order: ProductionOrder): GanttTaskModel {
    const startDate = this.parseDate(order.productionStart ?? order.createdAt) ?? new Date();
    const endDate = this.parseDate(order.deadline) ?? this.addDays(startDate, 30);
    const total = order.assignments?.length ?? 0;
    const done = (order.assignments ?? []).filter((item) => item.status === 'DONE').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      id: order.id,
      name: `${order.orderNumber} ${order.customerLabel || ''}`.trim(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      progress,
      custom_class: this.statusClass(order.productionStatus),
    };
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private addDays(base: Date, days: number): Date {
    const date = new Date(base);
    date.setDate(date.getDate() + days);
    return date;
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
