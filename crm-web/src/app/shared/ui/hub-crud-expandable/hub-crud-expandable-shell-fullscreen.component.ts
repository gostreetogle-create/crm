import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  NgZone,
  OnDestroy,
  signal,
} from '@angular/core';
import { LucideMenu } from '@lucide/angular';
import { HubCrudExpandStateService } from './hub-crud-expand-state.service';

@Component({
  selector: 'app-hub-crud-expandable-shell-fullscreen',
  standalone: true,
  imports: [LucideMenu],
  templateUrl: './hub-crud-expandable-shell-fullscreen.component.html',
  styleUrl: './hub-crud-expandable-shell-fullscreen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HubCrudExpandableShellFullscreenComponent implements AfterViewInit, OnDestroy {
  /** Уникальный ключ плитки (хаб или demo). */
  readonly tileKey = input.required<string>();

  readonly ariaLabel = input('Показать или скрыть полный список строк таблицы');

  /**
   * Fallback min-height якоря при открытии, если измерение дало 0 (ещё не отрисовалось).
   * В full-screen режиме якорь всё равно держит страницу в стабильном layout (без «прыжка вниз»).
   */
  readonly layoutReserveWhenOpen = input('min(13.5rem, 36vh)');

  readonly expand = inject(HubCrudExpandStateService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly ngZone = inject(NgZone);

  private resizeObserver: ResizeObserver | null = null;
  private shellHostRegistered = false;

  /** Высота якоря в свёрнутом потоке, px. */
  private readonly collapsedFlowHeightPx = signal<number | null>(null);

  /** Верх фиксированной панели (relative к viewport). */
  readonly isExpanded = computed(() => this.expand.expandState()[this.tileKey()] ?? false);

  private originalBodyOverflow: string | null = null;

  private readonly lockBodyScroll = effect(() => {
    if (typeof document === 'undefined') return;
    const open = this.isExpanded();
    const body = document.body;
    if (open) {
      if (this.originalBodyOverflow === null) {
        this.originalBodyOverflow = body.style.overflow;
      }
      body.style.overflow = 'hidden';
    } else {
      if (this.originalBodyOverflow !== null) {
        body.style.overflow = this.originalBodyOverflow;
        this.originalBodyOverflow = null;
      }
    }
  });

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
      // В full-screen режиме панель фиксирована; высоту якоря в потоке обновляем,
      // только пока не раскрыто (когда это влияет на layout страницы).
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
    if (typeof document !== 'undefined' && this.originalBodyOverflow !== null) {
      document.body.style.overflow = this.originalBodyOverflow;
      this.originalBodyOverflow = null;
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

