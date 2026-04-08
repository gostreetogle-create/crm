import {
  AfterViewInit,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  NgZone,
  OnDestroy,
  OnInit,
  afterNextRender,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TRADE_GOODS_REPOSITORY } from '@srm/trade-goods-data-access';
import { KP_RECIPIENT_ORG_PREFIX } from '../../kp-document-template/kp-document-template.component';
import { PageShellComponent, UiButtonComponent } from '@srm/ui-kit';
import { KpCatalogVitrineComponent } from '../../kp-catalog-vitrine/kp-catalog-vitrine.component';
import type { KpCatalogProduct } from '../../kp-catalog-vitrine/kp-catalog-product.model';
import {
  KpDocumentTemplateComponent,
  type KpLineItem,
} from '../../kp-document-template/kp-document-template.component';
import {
  calcKpTotalFromLines,
  calcKpVatAmountFromTotalWithoutRounding,
  formatKpQtyString,
  kpLineQtyOrPriceValidator,
  kpPhotoThumbMaxPxValidator,
  kpRowsPerPageValidator,
  kpVatAmountOptionalValidator,
  kpVatPercentValidator,
  mapTradeGoodListItemToKpCatalogProduct,
  parseKpNumber,
} from '../../kp-utils';
import { KpRecipientToolbarComponent } from '../../kp-recipient-toolbar/kp-recipient-toolbar.component';
import { LucidePrinter } from '@lucide/angular';
import { resolveKpOrganizationContactId } from '../../kp-utils';
import { KpBuilderFacade } from '../../kp-builder-state/kp-builder.facade';

@Component({
  selector: 'app-kp-builder-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageShellComponent,
    UiButtonComponent,
    KpCatalogVitrineComponent,
    KpDocumentTemplateComponent,
    KpRecipientToolbarComponent,
    LucidePrinter,
  ],
  templateUrl: './kp-builder-page.html',
  styleUrl: './kp-builder-page.scss',
})
export class KpBuilderPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly kpBuilderFacade = inject(KpBuilderFacade);
  private readonly tradeGoodsRepository = inject(TRADE_GOODS_REPOSITORY);
  private readonly router = inject(Router);

  /** Справочник организаций для выпадающего списка в шаблоне КП. */
  readonly organizations = this.kpBuilderFacade.organizations;

  /** Контактные лица (для выбора по организации). */
  readonly clients = this.kpBuilderFacade.clients;

  /**
   * Витрина КП: товары из справочника (`GET /api/trade-goods`).
   * При ошибке/пустом ответе показываем пустую витрину без demo-данных.
   */
  readonly kpCatalogProducts = signal<KpCatalogProduct[]>([]);

  @ViewChild('previewHost', { read: ElementRef }) previewHost?: ElementRef<HTMLElement>;

  private resizeObserver?: ResizeObserver;

  /**
   * Масштаб миниатюры КП под ширину колонки превью.
   * Лист A4 в шаблоне — 210mm; zoom = доступная ширина / 210mm.
   */
  readonly previewZoom = signal(0.68);

  /** Фиксированные отступы таблицы под макет PNG (редактирование в коде при смене макета). */
  /** Отступ контента от верха 1-го листа (под PNG). ~+13 мм к прежнему 52 мм — как высота строки заголовка КП. */
  readonly contentPaddingTop = '65mm';
  readonly contentPaddingTopPage2 = '44mm';

  readonly form = this.fb.group({
    /** Сколько строк на одном листе; следующие — на следующем листе (фон 2стр). */
    rowsPerPage: this.fb.nonNullable.control('12', [kpRowsPerPageValidator()]),
    /**
     * Получатель КП: `org:<id>` (организация) или `contact:<id>` (контактное лицо), пусто — не выбрано.
     */
    recipient: this.fb.nonNullable.control(''),
    /** Поиск по названию (фильтр пунктов в общем списке). */
    organizationSearch: this.fb.nonNullable.control(''),
    /**
     * При выборе организации с контактами — один контакт для строки «Контакт:» в КП (id из справочника).
     */
    organizationContactId: this.fb.nonNullable.control(''),
    /** Ставка НДС, % (по умолчанию 22). */
    vatPercent: this.fb.nonNullable.control('22', [kpVatPercentValidator()]),
    /** Сумма НДС в рублях (редактируемая; изначально считается от итога). */
    vatAmount: this.fb.nonNullable.control('', [kpVatAmountOptionalValidator()]),
    /** Максимальный размер миниатюры в колонке «Фото», px. */
    photoThumbMaxPx: this.fb.nonNullable.control('80', [kpPhotoThumbMaxPxValidator()]),
    // Стартуем с одной пустой строки, чтобы в КП не попадали моковые позиции.
    lines: this.fb.array([this.lineGroup('', '1', 'шт.', '0', '', '', '')]),
  });

  /**
   * Нормализация legacy recipient после загрузки организаций + синхронизация контакта.
   * Должен создаваться в injection context (поле класса), не в `ngOnInit`.
   */
  private readonly recipientLegacyEffect = effect(() => {
    const active = this.organizations();
    const raw = this.form.controls.recipient.value?.trim() ?? '';
    if (raw && !raw.includes(':') && active.some((o) => o.id === raw)) {
      this.form.controls.recipient.patchValue(`${KP_RECIPIENT_ORG_PREFIX}${raw}`, { emitEvent: false });
    }
    this.syncOrganizationContactId();
  });

  ngOnInit(): void {
    this.form.controls.vatPercent.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateVatAmountFromTotal());
    this.lines()
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateVatAmountFromTotal());
    this.recalculateVatAmountFromTotal();

    this.kpBuilderFacade.init(this.destroyRef);

    this.tradeGoodsRepository
      .getItems()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.ngZone.run(() => {
            const mapped = items
              .filter((t) => t.isActive)
              .map(mapTradeGoodListItemToKpCatalogProduct);
            this.kpCatalogProducts.set(mapped);
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.kpCatalogProducts.set([]);
          });
        },
      });

    this.form.controls.recipient.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncOrganizationContactId());
  }

  /** Сброс/подстановка контакта организации при смене получателя. */
  private syncOrganizationContactId(): void {
    const recipient = this.form.controls.recipient.value?.trim() ?? '';
    const contactCtrl = this.form.controls.organizationContactId;
    const cur = contactCtrl.value?.trim() ?? '';
    const resolved = resolveKpOrganizationContactId(recipient, this.organizations(), cur, KP_RECIPIENT_ORG_PREFIX);
    if (resolved === null) {
      // Несколько контактов: если текущий валиден — ничего не меняем.
      return;
    }
    contactCtrl.setValue(resolved, { emitEvent: false });
  }

  print(): void {
    window.print();
  }

  ngAfterViewInit(): void {
    const host = this.previewHost?.nativeElement;
    if (!host || typeof ResizeObserver === 'undefined') {
      return;
    }

    let zeroWidthRetries = 0;

    const update = () => {
      const el = this.previewHost?.nativeElement;
      if (!el) {
        return;
      }
      const cs = getComputedStyle(el);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      const innerW = Math.max(0, el.clientWidth - pl - pr);
      // Иногда при первом рендере ширина контейнера временно равна 0 — не ставим zoom,
      // иначе лист визуально «пропадает». Повторяем после layout (rAF), не более нескольких раз.
      if (innerW <= 1) {
        if (zeroWidthRetries < 24) {
          zeroWidthRetries += 1;
          this.ngZone.runOutsideAngular(() => {
            requestAnimationFrame(() => {
              this.ngZone.run(() => update());
            });
          });
        }
        return;
      }
      zeroWidthRetries = 0;
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
    afterNextRender(
      () => {
        this.ngZone.run(() => update());
      },
      { injector: this.injector },
    );
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

  /** Новая строка с типовыми значениями для быстрого ввода. */
  addLine(): void {
    this.lines().push(this.lineGroup('', '1', 'шт.', '0', '', '', ''));
  }

  /** Добавить позицию из витрины в таблицу КП и в PDF. Тот же товар — увеличить кол-во, не дублировать строку. */
  addFromVitrine(p: KpCatalogProduct): void {
    const direct = String(p.imageUrl ?? '').trim();
    const imageUrl =
      direct && (direct.startsWith('/') || direct.startsWith('http://') || direct.startsWith('https://'))
        ? direct
        : '';
    const unit = p.defaultUnit?.trim() || 'шт.';
    const linesArr = this.lines();
    const existingIdx = linesArr.controls.findIndex(
      (ctrl) => String(ctrl.get('catalogProductId')?.value ?? '').trim() === p.id,
    );
    if (existingIdx >= 0) {
      const g = linesArr.at(existingIdx);
      const cur = parseKpNumber(g.get('qty')?.value);
      g.patchValue({ qty: formatKpQtyString(cur + 1) });
      return;
    }
    linesArr.push(
      this.lineGroup(p.title, '1', unit, String(p.price), imageUrl, p.description?.trim() ?? '', p.id),
    );
  }

  /** Справочники: модалка редактирования товара; `returnTo` — возврат после закрытия. */
  navigateToEditTradeGood(p: KpCatalogProduct): void {
    if (p.source !== 'trade_good') return;
    void this.router.navigate(['/справочники', 'новый-товар'], {
      queryParams: { mode: 'edit', id: p.id },
    });
  }

  private lineGroup(
    name: string,
    qty: string,
    unit: string,
    price: string,
    imageUrl: string,
    description = '',
    catalogProductId = '',
  ) {
    const qtyPrice = kpLineQtyOrPriceValidator();
    return this.fb.group({
      name: this.fb.nonNullable.control(name, [Validators.maxLength(500)]),
      description: this.fb.nonNullable.control(description, [Validators.maxLength(2000)]),
      qty: this.fb.nonNullable.control(qty, [qtyPrice]),
      unit: this.fb.nonNullable.control(unit, [Validators.maxLength(64)]),
      price: this.fb.nonNullable.control(price, [qtyPrice]),
      imageUrl: this.fb.nonNullable.control(imageUrl, [Validators.maxLength(2048)]),
      catalogProductId: this.fb.nonNullable.control(catalogProductId, [Validators.maxLength(128)]),
    });
  }

  /**
   * Итого по таблице — сумма без НДС; НДС начисляется сверху: T × r / 100.
   * «Всего к оплате» в шаблоне = T + сумма НДС.
   */
  private recalculateVatAmountFromTotal(): void {
    const total = calcKpTotalFromLines(this.lines().getRawValue() as KpLineItem[]);
    const vat = calcKpVatAmountFromTotalWithoutRounding(total, this.form.controls.vatPercent.value);
    this.form.controls.vatAmount.patchValue(vat.toFixed(2), { emitEvent: false });
  }
}
