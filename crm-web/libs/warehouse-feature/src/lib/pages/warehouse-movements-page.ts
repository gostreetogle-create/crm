import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  WAREHOUSE_REPOSITORY,
  WarehouseMovement,
  WarehouseRepository,
  getMovementLabel,
  toStockMovementType,
} from '@srm/warehouse-data-access';
import { PageShellComponent } from '@srm/ui-kit';

@Component({
  standalone: true,
  selector: 'app-warehouse-movements-page',
  imports: [CommonModule, RouterLink, PageShellComponent],
  templateUrl: './warehouse-movements-page.html',
  styleUrl: './warehouse-movements-page.scss',
})
export class WarehouseMovementsPage implements OnInit {
  private readonly repository = inject<WarehouseRepository>(WAREHOUSE_REPOSITORY);
  readonly movements = signal<WarehouseMovement[]>([]);

  ngOnInit(): void {
    this.repository.getMovements().subscribe({ next: (rows) => this.movements.set(rows) });
  }

  typeLabel(type: WarehouseMovement['type']): string {
    return getMovementLabel(toStockMovementType(type));
  }
}
