import { CdkTrapFocus } from '@angular/cdk/a11y';
import { DOCUMENT, isPlatformBrowser, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';

export const MODAL_AUTO_CAPTURE = true;

/**
 * z-index backdrop по умолчанию — 1500 (ui-modal.scss).
 * Каскадная плитка хаба на `document.body` использует 1700 — вложенная модалка должна быть выше.
 */
export const UI_MODAL_Z_INDEX_ABOVE_CASCADE_HUB = 1800;

/**
 * Reusable modal dialog with CDK focus trap.
 * Используй [cdkTrapFocusAutoCapture]="true" для авто-фокуса.
 * cdkFocusInitial deprecated — не добавляй!
 *
 * Один компонент на весь продукт: отдельной «модалки без скролла» нет — контент до высоты окна,
 * прокрутка только если форма выше вьюпорта (см. design-system).
 *
 * Хост переносится в document.body: иначе у предков с filter/transform fixed-backdrop не на весь viewport.
 */
/* eslint-disable @angular-eslint/component-selector */
@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CdkTrapFocus, NgTemplateOutlet, NgClass],
  templateUrl: './ui-modal.html',
  styleUrl: './ui-modal.scss',
})
export class UiModal implements AfterViewInit, OnDestroy {
  private static openModalCount = 0;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) content!: TemplateRef<unknown>;
  @Input() actions: TemplateRef<unknown> | null = null;
  /** `lg` / `xl` — шире окно; высота контента везде до `100dvh` без искусственного усечения. */
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() closeOnBackdrop = true;
  /**
   * Поднять слой модалки над каскадной плиткой (см. `UI_MODAL_Z_INDEX_ABOVE_CASCADE_HUB`).
   * Если не задано — используется z-index из стилей (1500).
   */
  @Input() backdropZIndex: number | null = null;

  @Output('close') readonly closed = new EventEmitter<void>();

  @ViewChild('modalTitle', { read: ElementRef }) private readonly modalTitleRef?: ElementRef<HTMLElement>;
  @ViewChild('modalCloseButton', { read: ElementRef })
  private readonly modalCloseButtonRef?: ElementRef<HTMLButtonElement>;

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly autoCapture = MODAL_AUTO_CAPTURE;

  readonly titleId = `ui-modal-title-${Math.random().toString(36).slice(2, 10)}`;
  private readonly previouslyFocusedElement = document.activeElement as HTMLElement | null;

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const host = this.hostRef.nativeElement;
      if (host.parentElement && host.parentElement !== this.doc.body) {
        this.doc.body.appendChild(host);
      }
      if (UiModal.openModalCount === 0) {
        this.doc.documentElement.style.overflow = 'hidden';
        this.doc.body.style.overflow = 'hidden';
      }
      UiModal.openModalCount += 1;
    }
    // В CDK 21+ initial focus через autoCapture, не cdkFocusInitial.
    queueMicrotask(() => this.ensureInitialFocusFallback());
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    UiModal.openModalCount = Math.max(0, UiModal.openModalCount - 1);
    if (UiModal.openModalCount === 0) {
      this.doc.documentElement.style.overflow = '';
      this.doc.body.style.overflow = '';
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.requestClose();
  }

  onBackdropClick(event?: Event): void {
    if (!this.closeOnBackdrop) {
      return;
    }
    if (event && event.target !== event.currentTarget) {
      return;
    }
    this.requestClose();
  }

  requestClose(): void {
    this.restoreFocus();
    this.closed.emit();
  }

  private restoreFocus(): void {
    if (!this.previouslyFocusedElement) {
      return;
    }
    if (!this.hostRef.nativeElement.contains(this.previouslyFocusedElement)) {
      this.previouslyFocusedElement.focus();
    }
  }

  private ensureInitialFocusFallback(): void {
    const dialog = this.hostRef.nativeElement.querySelector('.modalDialog') as HTMLElement | null;
    if (!dialog) {
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && dialog.contains(activeElement)) {
      return;
    }

    // Optional manual focus target in projected content.
    const customFocusTarget =
      (dialog.querySelector('#focusMe') as HTMLElement | null) ??
      (dialog.querySelector('[data-focus-me]') as HTMLElement | null) ??
      (dialog.querySelector('[data-modal-focus]') as HTMLElement | null);

    if (customFocusTarget) {
      customFocusTarget.focus();
      return;
    }

    const titleElement = this.modalTitleRef?.nativeElement;
    if (titleElement) {
      titleElement.focus();
      return;
    }

    this.modalCloseButtonRef?.nativeElement.focus();
  }
}
