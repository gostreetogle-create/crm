import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { API_CONFIG } from '@srm/platform-core';
import { labelByStatusKey, normalizeCommercialOfferStatusKey, type ProposalStatusKey } from './commercial-offer-status.rules';
import { mapOfferDtoToPayload, type CommercialOfferDto } from './commercial-offers.mapper';
import { addProcessingId, removeProcessingId } from './processing-by-id.util';
import {
  mapCommercialOfferDeleteError,
  mapCommercialOfferStatusError,
} from './commercial-offers-error-mapping';
import { formatRuDateTimeOrDash, formatRuMoney2 } from './presentation-formatters';

type CommercialOfferListItem = {
  id: string;
  number: string | null;
  title: string | null;
  currentStatusKey: ProposalStatusKey | string;
  organizationLabel: string | null;
  clientLabel: string | null;
  recipient: string | null;
  totalAmount: number;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class CommercialOffersStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  readonly items = signal<CommercialOfferListItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly processingStatusIds = signal<Set<string>>(new Set<string>());

  readonly commercialOffersData = computed(() =>
    [...this.items()]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map((item) => {
        const normalizedStatus = normalizeCommercialOfferStatusKey(item.currentStatusKey);
        const header = item.number?.trim() || item.title?.trim() || `КП ${item.id.slice(0, 8)}`;
        const statusLabel = labelByStatusKey(normalizedStatus);
        const recipientLabel =
          item.organizationLabel?.trim() || item.clientLabel?.trim() || item.recipient?.trim() || '—';
        return {
          id: item.id,
          hubLine: `${header} · ${statusLabel}`,
          numberOrTitle: header,
          statusLabel,
          statusKey: normalizedStatus,
          recipientLabel,
          totalAmountLabel: `${formatRuMoney2(item.totalAmount)} ₽`,
          updatedAtLabel: formatRuDateTimeOrDash(item.updatedAt),
        };
      }),
  );

  loadItems(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<CommercialOfferListItem[]>(this.endpoint()).subscribe({
      next: (items) => {
        this.items.set(Array.isArray(items) ? items : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err instanceof Error ? err.message : 'Не удалось загрузить коммерческие предложения');
      },
    });
  }

  remove(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.delete(this.endpoint(`/${id}`)).subscribe({
      next: () => this.loadItems(),
      error: (err) => {
        this.loading.set(false);
        this.error.set(mapCommercialOfferDeleteError(err));
      },
    });
  }

  updateStatus(id: string, statusKey: ProposalStatusKey): void {
    this.error.set(null);
    if (!id.trim()) return;
    this.processingStatusIds.update((prev) => {
      return addProcessingId(prev, id);
    });
    this.http
      .post(this.endpoint(`/${id}/status`), { statusKey })
      .pipe(
        finalize(() => {
          this.processingStatusIds.update((prev) => {
            return removeProcessingId(prev, id);
          });
        }),
      )
      .subscribe({
      next: () => this.loadItems(),
      error: (err) => {
        this.error.set(mapCommercialOfferStatusError(err));
      },
    });
  }

  duplicate(id: string, onCreated?: (newId: string) => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<CommercialOfferDto>(this.endpoint(`/${id}`)).subscribe({
      next: (source) => {
        const payload = mapOfferDtoToPayload(source, { copyTitle: true, skipCatalogSync: false });
        this.http.post<CommercialOfferDto>(this.endpoint(), payload).subscribe({
          next: (created) => {
            onCreated?.(created.id);
            this.loadItems();
          },
          error: (err) => {
            this.loading.set(false);
            this.error.set(err instanceof Error ? err.message : 'Не удалось скопировать коммерческое предложение');
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err instanceof Error ? err.message : 'Не удалось загрузить исходное коммерческое предложение');
      },
    });
  }

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/commercial-offers${path}`;
  }
}

