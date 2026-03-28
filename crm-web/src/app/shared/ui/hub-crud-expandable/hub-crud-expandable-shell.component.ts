import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  NgZone,
  OnDestroy,
  signal,
} from '@angular/core';
import { LucideMenu } from '@lucide/angular';
import { HubCrudExpandStateService } from './hub-crud-expand-state.service';

@Component({
  selector: 'app-hub-crud-expandable-shell',
  standalone: true,
  imports: [LucideMenu],
  templateUrl: './hub-crud-expandable-shell.component.html',
  styleUrl: './hub-crud-expandable-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HubCrudExpandableShellComponent implements AfterViewInit, OnDestroy {
  /** Уникальный ключ плитки (хаб или demo). */
  readonly tileKey = input.required<string>();

  readonly ariaLabel = input('Показать или скрыть полный список строк таблицы');

  /**
   * Fallback min-height якоря при открытии, если измерение дало 0 (ещё не отрисовалось).
   */
  readonly layoutReserveWhenOpen = input('min(13.5rem, 36vh)');

  readonly expand = inject(HubCrudExpandStateService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly ngZone = inject(NgZone);

  private resizeObserver: ResizeObserver | null = null;
  private shellHostRegistered = false;

  /**
   * Высота всей плитки в свёрнутом виде (как в потоке документа), px.
   * Перед открытием переснимаем синхронно — иначе после position:absolute якорь схлопывается и контент «прыгает».
   */
  private readonly collapsedFlowHeightPx = signal<number | null>(null);

  readonly isExpanded = computed(() => this.expand.expandState()[this.tileKey()] ?? false);

  readonly anchorMinHeightWhenOpen = computed(() => {
    if (!this.isExpanded()) {
      return null;
    }
    const h = this.collapsedFlowHeightPx();
    if (h != null && h > 0) {
      return `${h}px`;
    }
    return this.layoutReserveWhenOpen();
  });

  onToggleClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.isExpanded()) {
      const h = this.host.nativeElement.offsetHeight;
      this.collapsedFlowHeightPx.set(h > 0 ? h : null);
    }
    this.expand.toggle(this.tileKey());
  }

  ngAfterViewInit(): void {
    const root = this.host.nativeElement;
    this.expand.registerShellHost(this.tileKey(), root);
    this.shellHostRegistered = true;

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.isExpanded()) {
        return;
      }
      this.applyMeasuredHeight(root.offsetHeight);
    });
    this.resizeObserver.observe(root);
  }

  ngOnDestroy(): void {
    if (this.shellHostRegistered) {
      this.expand.unregisterShellHost(this.tileKey());
      this.shellHostRegistered = false;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private applyMeasuredHeight(h: number): void {
    const next = h > 0 ? h : null;
    this.ngZone.run(() => {
      if (this.collapsedFlowHeightPx() !== next) {
        this.collapsedFlowHeightPx.set(next);
      }
    });
  }
}
