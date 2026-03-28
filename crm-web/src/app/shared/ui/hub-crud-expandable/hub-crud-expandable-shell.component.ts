import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
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
   * Запас высоты в потоке при открытии, если ещё не успели измерить свёрнутую панель (fallback).
   */
  @Input() layoutReserveWhenOpen = 'min(13.5rem, 36vh)';

  @ViewChild('hubPanel', { read: ElementRef }) private hubPanelRef?: ElementRef<HTMLElement>;

  readonly expand = inject(HubCrudExpandStateService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  private resizeObserver: ResizeObserver | null = null;

  /** Высота панели в свёрнутом виде (контент + кнопка), пиксели — для min-height якоря при открытии. */
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
    this.expand.toggle(this.tileKey);
  }

  ngAfterViewInit(): void {
    const el = this.hubPanelRef?.nativeElement;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.expand.isOpen(this.tileKey)) {
        return;
      }
      const h = el.getBoundingClientRect().height;
      const rounded = Math.ceil(h);
      const next = rounded > 0 ? Math.max(rounded, 48) : null;
      this.ngZone.run(() => {
        if (this.collapsedFlowHeightPx !== next) {
          this.collapsedFlowHeightPx = next;
          this.cdr.markForCheck();
        }
      });
    });
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  /** Min-height якоря в документе, пока оверлей открыт (без скачка относительно свёрнутого вида). */
  anchorMinHeightWhenOpen(): string | null {
    if (!this.expand.isOpen(this.tileKey)) {
      return null;
    }
    if (this.collapsedFlowHeightPx != null) {
      return `${this.collapsedFlowHeightPx}px`;
    }
    return this.layoutReserveWhenOpen;
  }
}
