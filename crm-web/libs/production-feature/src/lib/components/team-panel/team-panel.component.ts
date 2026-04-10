import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProductionOrder } from '../../production.types';

export type TeamPanelMember = {
  id: string;
  name: string;
  initials: string;
  statusDot: 'free' | 'busy-soft' | 'busy-hard';
  statusText: string;
  title: string;
  activePositionCount: number;
};

@Component({
  selector: 'app-team-panel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './team-panel.component.html',
  styleUrl: './team-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPanelComponent {
  @Input() members: TeamPanelMember[] = [];
  @Input() orders: ProductionOrder[] = [];

  readonly expandedWorkerId = signal<string | null>(null);

  toggleWorker(workerId: string): void {
    this.expandedWorkerId.update((id) => (id === workerId ? null : workerId));
  }

  activeOrdersFor(workerId: string): ProductionOrder[] {
    return this.orders.filter(
      (order) =>
        order.productionStatus !== 'DONE' &&
        order.assignments.some((a) => a.workerId === workerId && a.status !== 'DONE'),
    );
  }
}
