import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { API_CONFIG } from '@srm/platform-core';
import { normalizeCommercialOfferStatusKey, type ProposalStatusKey } from './commercial-offer-status.rules';
import {
  mapCommercialOfferDeleteError,
  mapCommercialOfferStatusError,
} from './commercial-offers-error-mapping';

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

type CommercialOfferLineDto = {
  lineNo: number;
  name: string;
  description: string | null;
  qty: number;
  unit: string;
  unitPrice: number;
  imageUrl: string | null;
  catalogProductId: string | null;
  sortOrder: number;
};

type CommercialOfferDto = {
  id: string;
  number: string | null;
  title: string | null;
  currentStatusKey: string;
  organizationId: string | null;
  clientId: string | null;
  organizationContactId: string | null;
  recipient: string | null;
  validUntil: string | null;
  currency: string;
  vatPercent: number;
  vatAmount: number;
  notes: string | null;
  lines: CommercialOfferLineDto[];
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
        const statusLabel = this.statusLabel(normalizedStatus);
        const recipientLabel =
          item.organizationLabel?.trim() || item.clientLabel?.trim() || item.recipient?.trim() || '—';
        return {
          id: item.id,
          hubLine: `${header} · ${statusLabel}`,
          numberOrTitle: header,
          statusLabel,
          statusKey: normalizedStatus,
          recipientLabel,
          totalAmountLabel: `${this.money(item.totalAmount)} ₽`,
          updatedAtLabel: this.dateTime(item.updatedAt),
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
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    this.http
      .post(this.endpoint(`/${id}/status`), { statusKey })
      .pipe(
        finalize(() => {
          this.processingStatusIds.update((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
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
        const payload = {
          number: null,
          title: source.title?.trim() ? `${source.title.trim()} (копия)` : null,
          currentStatusKey: 'proposal_draft' as const,
          organizationId: source.organizationId,
          clientId: source.clientId,
          organizationContactId: source.organizationContactId,
          recipient: source.recipient,
          validUntil: source.validUntil,
          currency: source.currency,
          vatPercent: source.vatPercent,
          vatAmount: source.vatAmount,
          notes: source.notes,
          lines: (source.lines ?? []).map((line, idx) => ({
            lineNo: idx + 1,
            name: line.name,
            description: line.description,
            qty: line.qty,
            unit: line.unit,
            unitPrice: line.unitPrice,
            imageUrl: line.imageUrl,
            catalogProductId: line.catalogProductId,
            sortOrder: idx,
          })),
          skipCatalogSync: false,
        };
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

  private statusLabel(key: string): string {
    if (key === 'proposal_draft') return 'Черновик';
    if (key === 'proposal_waiting') return 'На согласовании';
    if (key === 'proposal_approved') return 'На согласовании';
    if (key === 'proposal_paid') return 'Оплачено';
    return key || '—';
  }

  private money(v: number): string {
    if (!Number.isFinite(v)) return '0';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  }

  private dateTime(raw: string): string {
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

