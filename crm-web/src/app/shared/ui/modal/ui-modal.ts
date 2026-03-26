import { CdkTrapFocus } from '@angular/cdk/a11y';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';

export const MODAL_AUTO_CAPTURE = true;

/**
 * Reusable modal dialog with CDK focus trap.
 * Используй [cdkTrapFocusAutoCapture]="true" для авто-фокуса.
 * cdkFocusInitial deprecated — не добавляй!
 */
/* eslint-disable @angular-eslint/component-selector */
@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CdkTrapFocus, NgTemplateOutlet, NgClass],
  templateUrl: './ui-modal.html',
  styleUrl: './ui-modal.scss',
})
export class UiModal implements AfterViewInit {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) content!: TemplateRef<unknown>;
  @Input() actions: TemplateRef<unknown> | null = null;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  @Output('close') readonly closed = new EventEmitter<void>();

  @ViewChild('modalTitle', { read: ElementRef }) private readonly modalTitleRef?: ElementRef<HTMLElement>;
  @ViewChild('modalCloseButton', { read: ElementRef })
  private readonly modalCloseButtonRef?: ElementRef<HTMLButtonElement>;

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  readonly autoCapture = MODAL_AUTO_CAPTURE;

  readonly titleId = `ui-modal-title-${Math.random().toString(36).slice(2, 10)}`;
  private readonly previouslyFocusedElement = document.activeElement as HTMLElement | null;

  ngAfterViewInit(): void {
    // В CDK 21+ initial focus через autoCapture, не cdkFocusInitial.
    queueMicrotask(() => this.ensureInitialFocusFallback());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.requestClose();
  }

  onBackdropClick(event?: Event): void {
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
