import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';
import { LucideMenu } from '@lucide/angular';
import { HubCrudExpandStateService } from './hub-crud-expand-state.service';

@Component({
  selector: 'app-hub-crud-expandable-shell',
  standalone: true,
  imports: [LucideMenu],
  templateUrl: './hub-crud-expandable-shell.component.html',
  styleUrl: './hub-crud-expandable-shell.component.scss',
})
export class HubCrudExpandableShellComponent implements AfterViewInit, OnDestroy {
  /** Уникальный ключ плитки (хаб или demo). */
  @Input({ required: true }) tileKey!: string;
  @Input() ariaLabel = 'Показать или скрыть полный список строк таблицы';

  /**
   * Fallback min-height якоря при открытии, если измерение дало 0 (ещё не отрисовалось).
   */
  @Input() layoutReserveWhenOpen = 'min(13.5rem, 36vh)';

  readonly expand = inject(HubCrudExpandStateService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  private resizeObserver: ResizeObserver | null = null;

  /**
   * Высота всей плитки в свёрнутом виде (как в потоке документа), px.
   * Перед открытием обязательно переснимаем синхронно — иначе после position:absolute якорь схлопывается и контент «прыгает».
   */
  private collapsedFlowHeightPx: number | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.expand.isOpen(this.tileKey)) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (this.host.nativeElement.contains(target)) {
      return;
    }
    this.expand.close(this.tileKey);
  }

  onToggleClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.expand.isOpen(this.tileKey)) {
      const h = this.host.nativeElement.offsetHeight;
      this.collapsedFlowHeightPx = h > 0 ? h : null;
    }
    this.expand.toggle(this.tileKey);
  }

  ngAfterViewInit(): void {
    const root = this.host.nativeElement;
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.expand.isOpen(this.tileKey)) {
        return;
      }
      this.applyMeasuredHeight(root.offsetHeight);
    });
    this.resizeObserver.observe(root);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  /** Min-height якоря в потоке, пока оверлей открыт. */
  anchorMinHeightWhenOpen(): string | null {
    if (!this.expand.isOpen(this.tileKey)) {
      return null;
    }
    if (this.collapsedFlowHeightPx != null && this.collapsedFlowHeightPx > 0) {
      return `${this.collapsedFlowHeightPx}px`;
    }
    return this.layoutReserveWhenOpen;
  }

  private applyMeasuredHeight(h: number): void {
    const next = h > 0 ? h : null;
    this.ngZone.run(() => {
      if (this.collapsedFlowHeightPx !== next) {
        this.collapsedFlowHeightPx = next;
        this.cdr.markForCheck();
      }
    });
  }
}
