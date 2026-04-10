import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';
import { ProductionGanttComponent } from '../../components/production-gantt/production-gantt.component';
import { ContentCardComponent, PageShellComponent } from '@srm/ui-kit';
import { ProductionOrder, ProductionStatus } from '../../production.types';
import { ProductionStore } from '../../state/production.store';

@Component({
  standalone: true,
  selector: 'app-production-board-page',
  imports: [
    CommonModule,
    RouterLink,
    DragDropModule,
    PageShellComponent,
    ContentCardComponent,
    ProductionGanttComponent,
  ],
  providers: [ProductionStore],
  templateUrl: './production-board-page.html',
  styleUrl: './production-board-page.scss',
})
export class ProductionBoardPage implements OnInit {
  readonly store = inject(ProductionStore);
  readonly viewMode = signal<'KANBAN' | 'GANTT'>('KANBAN');
  readonly columns: ProductionStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE'];
  readonly dropListConnections: Record<ProductionStatus, ProductionStatus[]> = {
    PENDING: ['IN_PROGRESS', 'DONE'],
    IN_PROGRESS: ['PENDING', 'DONE'],
    DONE: ['PENDING', 'IN_PROGRESS'],
  };
  readonly filters = [
    { value: 'ALL', label: 'Все' },
    { value: 'PENDING', label: 'Ожидает' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'DONE', label: 'Готово' },
  ] as const;

  readonly hasData = computed(() => this.store.orders().length > 0);

  ngOnInit(): void {
    this.store.loadOrders();
  }

  setFilter(filter: 'ALL' | ProductionStatus): void {
    this.store.filter.set(filter);
  }

  isOverdue(order: ProductionOrder): boolean {
    if (!order.deadline || order.productionStatus === 'DONE') return false;
    const deadline = new Date(order.deadline);
    if (Number.isNaN(deadline.getTime())) return false;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const deadlineStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).getTime();
    return deadlineStart < todayStart;
  }

  progressLabel(order: ProductionOrder): string {
    const p = this.store.progress(order);
    return `${p.done} из ${p.total}`;
  }

  ordersByStatus(status: ProductionStatus): ProductionOrder[] {
    switch (status) {
      case 'PENDING':
        return this.store.pendingOrders();
      case 'IN_PROGRESS':
        return this.store.inProgressOrders();
      case 'DONE':
        return this.store.doneOrders();
    }
  }

  onDrop(event: CdkDragDrop<ProductionOrder[]>, newColumn: ProductionStatus): void {
    const order = event.item.data as ProductionOrder | undefined;
    if (!order || order.productionStatus === newColumn) return;
    this.store.updateOrderStatus(order.id, newColumn);
  }

  setView(mode: 'KANBAN' | 'GANTT'): void {
    this.viewMode.set(mode);
  }
}
