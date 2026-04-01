import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  NgZone,
  signal,
  ViewChild,
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PageShellComponent, UiButtonComponent } from '@srm/ui-kit';
import { KpCatalogVitrineComponent } from '../../kp-catalog-vitrine/kp-catalog-vitrine.component';
import type { KpCatalogProduct } from '../../kp-catalog-vitrine/kp-catalog-product.model';
import { KpDocumentTemplateComponent } from '../../kp-document-template/kp-document-template.component';
import { LucidePlus, LucidePrinter } from '@lucide/angular';

@Component({
  selector: 'app-kp-builder-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageShellComponent,
    UiButtonComponent,
    KpCatalogVitrineComponent,
    KpDocumentTemplateComponent,
    LucidePlus,
    LucidePrinter,
  ],
  templateUrl: './kp-builder-page.html',
  styleUrl: './kp-builder-page.scss',
})
export class KpBuilderPage implements AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly ngZone = inject(NgZone);

  @ViewChild('previewHost', { read: ElementRef }) previewHost?: ElementRef<HTMLElement>;

  private resizeObserver?: ResizeObserver;

  /**
   * Масштаб миниатюры КП под ширину колонки превью.
   * Лист A4 в шаблоне — 210mm; zoom = доступная ширина / 210mm.
   */
  readonly previewZoom = signal(0.68);

  /** Фиксированные отступы таблицы под макет PNG (редактирование в коде при смене макета). */
  readonly contentPaddingTop = '78mm';
  readonly contentPaddingTopPage2 = '44mm';

  readonly form = this.fb.group({
    /** Сколько строк на одном листе; следующие — на следующем листе (фон 2стр). */
    rowsPerPage: this.fb.nonNullable.control('12'),
    lines: this.fb.array([
      this.lineGroup('Профиль алюминиевый ПА-01', '10', 'м', '1250.50'),
      this.lineGroup('Поликарбонат сотовый 8 мм', '24', 'м²', '890'),
      this.lineGroup('Крепёж комплект', '5', 'компл.', '450'),
    ]),
  });

  print(): void {
    window.print();
  }

  ngAfterViewInit(): void {
    const host = this.previewHost?.nativeElement;
    if (!host || typeof ResizeObserver === 'undefined') {
      return;
    }

    const update = () => {
      const el = this.previewHost?.nativeElement;
      if (!el) {
        return;
      }
      const cs = getComputedStyle(el);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      const innerW = Math.max(0, el.clientWidth - pl - pr);
      const sheetW = this.mmToPx(210);
      const z = sheetW > 0 ? Math.max(0.12, Math.min(2.5, innerW / sheetW)) : 0.68;
      this.previewZoom.set(z);
    };

    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => update());
      });
      this.resizeObserver.observe(host);
    });
    queueMicrotask(() => this.ngZone.run(() => update()));
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private mmToPx(mm: number): number {
    if (typeof document === 'undefined') {
      return mm * 3.78;
    }
    const probe = document.createElement('div');
    probe.style.width = `${mm}mm`;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.left = '-9999px';
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);
    return w > 0 ? w : mm * 3.78;
  }

  lines(): FormArray {
    return this.form.controls.lines;
  }

  rowsPerPageNumber(): number {
    const v = this.form.controls.rowsPerPage.value?.trim();
    const n = v ? parseInt(v, 10) : 12;
    return Number.isFinite(n) && n >= 1 ? n : 12;
  }

  /** Новая строка с типовыми значениями для быстрого ввода. */
  addLine(): void {
    this.lines().push(this.lineGroup('', '1', 'шт.', '0'));
  }

  /** Добавить позицию из витрины в таблицу КП и в PDF. */
  addFromVitrine(p: KpCatalogProduct): void {
    this.lines().push(this.lineGroup(p.title, '1', 'шт.', String(p.price)));
  }

  private lineGroup(name: string, qty: string, unit: string, price: string) {
    return this.fb.group({
      name: this.fb.nonNullable.control(name),
      qty: this.fb.nonNullable.control(qty),
      unit: this.fb.nonNullable.control(unit),
      price: this.fb.nonNullable.control(price),
    });
  }
}
