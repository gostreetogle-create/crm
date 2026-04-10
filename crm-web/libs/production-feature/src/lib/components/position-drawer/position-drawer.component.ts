import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { resolveTradeGoodLinePhotoUrl } from '@srm/platform-core';

import { ProductionLineSnapshot, ProductionLineStatus, Worker } from '../../production.types';

export type PositionSaveState = Record<'status' | 'worker' | 'dates', 'idle' | 'saving' | 'saved'>;

@Component({
  selector: 'app-position-drawer',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './position-drawer.component.html',
  styleUrl: './position-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionDrawerComponent {
  @Input({ required: true }) line!: ProductionLineSnapshot;
  @Input() workers: Worker[] = [];
  @Input() workerId = '';
  @Input() startDate = '';
  @Input() endDate = '';
  @Input() lineStatus: ProductionLineStatus = 'DESIGNING';
  @Input() positionSaveState: PositionSaveState = {
    status: 'idle',
    worker: 'idle',
    dates: 'idle',
  };

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly statusChange = new EventEmitter<ProductionLineStatus>();
  @Output() readonly workerChange = new EventEmitter<string>();
  @Output() readonly startDateChange = new EventEmitter<string>();
  @Output() readonly endDateChange = new EventEmitter<string>();

  onBackdropClick(): void {
    this.close.emit();
  }

  workerLabel(workerId: string): string {
    const w = this.workers.find((item) => item.id === workerId);
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

  hasLinePhoto(line: ProductionLineSnapshot | undefined): boolean {
    if (!line) return false;
    const photo = line.photoUrl || line.photo || line.imageUrl || line.thumbnailUrl;
    return typeof photo === 'string' && photo.trim().length > 0;
  }

  linePhotoUrl(line: ProductionLineSnapshot | undefined): string {
    if (!line) return '';
    const raw = line.photoUrl || line.photo || line.imageUrl || line.thumbnailUrl || '';
    return resolveTradeGoodLinePhotoUrl(raw, '');
  }
}
