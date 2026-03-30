import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
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

/** Выше `.modalBackdrop` (1500 в ui-modal.scss), хост на body соревнуется с модалкой как сосед. */
const CASCADE_PORTAL_Z_INDEX = '1700';

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
   * Поднять слой fullscreen выше модалок (z-index 1500), чтобы каскад из модалки «Материал»
   * оставлял форму открытой под плиткой справочника.
   */
  readonly stackAboveModals = input(false);

  /**
   * Fallback min-height якоря при открытии, если измерение дало 0 (ещё не отрисовалось).
   * В full-screen режиме якорь всё равно держит страницу в стабильном layout (без «прыжка вниз»).
   */
  readonly layoutReserveWhenOpen = input('min(13.5rem, 36vh)');

  readonly expand = inject(HubCrudExpandStateService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly ngZone = inject(NgZone);
  private readonly doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private resizeObserver: ResizeObserver | null = null;
  private shellHostRegistered = false;

  /**
   * Каскад: `ui-modal` переносится в document.body (см. UiModal), поэтому весь слой приложения
   * оказывается «ниже» соседа-body независимо от z-index внутри. Здесь — тот же приём:
   * пока открыта плитка поверх модалки, хост переносим на body с z-index выше модалки.
   */
  private portalPlaceholder: HTMLElement | null = null;
  private portalRestoreParent: HTMLElement | null = null;

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

  private readonly cascadePortalToBody = effect(() => {
    const shouldPortal = this.stackAboveModals() && this.isExpanded();
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    queueMicrotask(() => {
      const still = this.stackAboveModals() && this.isExpanded();
      if (still) {
        this.attachCascadePortalIfNeeded();
      } else {
        this.detachCascadePortalIfNeeded();
      }
    });
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
    if (isPlatformBrowser(this.platformId)) {
      this.detachCascadePortalIfNeeded();
    }
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

  private attachCascadePortalIfNeeded(): void {
    const host = this.host.nativeElement;
    if (host.parentElement === this.doc.body) {
      return;
    }
    const parent = host.parentElement;
    if (!parent) {
      return;
    }

    const ph = this.doc.createElement('div');
    ph.setAttribute('aria-hidden', 'true');
    ph.style.boxSizing = 'border-box';
    ph.style.minWidth = '0';
    ph.style.minHeight = `${Math.max(host.offsetHeight, 1)}px`;

    this.portalRestoreParent = parent;
    parent.insertBefore(ph, host);
    this.doc.body.appendChild(host);
    host.style.setProperty('position', 'relative');
    host.style.setProperty('z-index', CASCADE_PORTAL_Z_INDEX);
    this.portalPlaceholder = ph;
  }

  private detachCascadePortalIfNeeded(): void {
    const host = this.host.nativeElement;
    if (host.parentElement !== this.doc.body) {
      this.portalPlaceholder = null;
      this.portalRestoreParent = null;
      return;
    }

    host.style.removeProperty('position');
    host.style.removeProperty('z-index');

    const ph = this.portalPlaceholder;
    const restoreParent = this.portalRestoreParent;

    if (ph?.parentElement) {
      ph.parentElement.replaceChild(host, ph);
    } else if (restoreParent) {
      restoreParent.appendChild(host);
    } else {
      this.doc.body.removeChild(host);
    }

    this.portalPlaceholder = null;
    this.portalRestoreParent = null;
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

