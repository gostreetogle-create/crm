import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '@srm/platform-core';
import { isDraft, setProcessingId, type ProposalStatusKey } from '@srm/dictionaries-state';
import { mapOfferDtoToPayload, type CommercialOfferDto, type CommercialOfferPayload } from '@srm/dictionaries-state';

export type OfferListItemDto = { number?: string | null };

export type DraftOfferListItemDto = {
  id: string;
  number?: string | null;
  createdAt?: string | null;
  recipient?: string | null;
  currentStatusKey?: string | null;
  statusKey?: string | null;
  status?: string | null;
};

export type LastExtraTextsDto = {
  extraTexts?: string[] | null;
  sourceOfferId?: string | null;
  updatedAt?: string | null;
};

@Injectable({ providedIn: 'root' })
export class KpBuilderOffersStore {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly draftOffers = signal<DraftOfferListItemDto[]>([]);
  readonly processingById = signal<Set<string>>(new Set<string>());

  async loadOffer(id: string): Promise<CommercialOfferDto | null> {
    if (!id.trim()) return null;
    this.loading.set(true);
    this.error.set(null);
    try {
      return await firstValueFrom(this.http.get<CommercialOfferDto>(this.endpoint(`/${id}`)));
    } catch {
      this.error.set('Не удалось загрузить КП.');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async saveOffer(payload: CommercialOfferPayload, id?: string | null): Promise<CommercialOfferDto | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (id?.trim()) {
        const { currentStatusKey: _currentStatusKey, ...putPayload } = payload;
        return await firstValueFrom(this.http.put<CommercialOfferDto>(this.endpoint(`/${id}`), putPayload));
      }
      return await firstValueFrom(this.http.post<CommercialOfferDto>(this.endpoint(), payload));
    } catch {
      this.error.set('Не удалось сохранить КП.');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async changeStatus(id: string, statusKey: ProposalStatusKey, orderNumber?: string): Promise<CommercialOfferDto | null> {
    if (!id.trim()) return null;
    this.loading.set(true);
    this.error.set(null);
    try {
      return await firstValueFrom(
        this.http.post<CommercialOfferDto>(this.endpoint(`/${id}/status`), {
          nextStatus: statusKey,
          ...(statusKey === 'proposal_paid' ? { orderNumber } : {}),
        }),
      );
    } catch {
      this.error.set('Не удалось сменить статус КП.');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async printOffer(id: string): Promise<boolean> {
    if (!id.trim()) return false;
    this.error.set(null);
    try {
      await firstValueFrom(this.http.post(this.endpoint(`/${id}/print`), {}));
      return true;
    } catch {
      this.error.set('Не удалось зафиксировать печать КП.');
      return false;
    }
  }

  async loadDrafts(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const rows = await firstValueFrom(this.http.get<DraftOfferListItemDto[]>(this.endpoint()));
      this.draftOffers.set((rows ?? []).filter((row) => isDraft(row)));
    } catch {
      this.draftOffers.set([]);
      this.error.set('Не удалось загрузить черновики КП.');
    } finally {
      this.loading.set(false);
    }
  }

  async copyDraft(id: string): Promise<CommercialOfferDto | null> {
    if (!id.trim()) return null;
    this.setRowBusy(id, true);
    this.error.set(null);
    try {
      const source = await firstValueFrom(this.http.get<CommercialOfferDto>(this.endpoint(`/${id}`)));
      const payload = mapOfferDtoToPayload(source, { skipCatalogSync: true, copyTitle: false });
      return await firstValueFrom(this.http.post<CommercialOfferDto>(this.endpoint(), payload));
    } catch {
      this.error.set('Не удалось скопировать черновик КП.');
      return null;
    } finally {
      this.setRowBusy(id, false);
    }
  }

  async deleteDraft(id: string): Promise<boolean> {
    if (!id.trim()) return false;
    this.setRowBusy(id, true);
    this.error.set(null);
    try {
      await firstValueFrom(this.http.delete(this.endpoint(`/${id}`)));
      return true;
    } catch {
      this.error.set('Не удалось удалить черновик КП.');
      return false;
    } finally {
      this.setRowBusy(id, false);
    }
  }

  async loadLastOfferNumber(): Promise<string | null> {
    try {
      const offers = await firstValueFrom(this.http.get<OfferListItemDto[]>(this.endpoint()));
      return offers?.[0]?.number?.trim() || null;
    } catch {
      return null;
    }
  }

  async loadLastExtraTexts(): Promise<string[]> {
    try {
      const data = await firstValueFrom(this.http.get<LastExtraTextsDto>(this.endpoint('/last-extra-texts')));
      if (!Array.isArray(data?.extraTexts)) {
        return [];
      }
      return data.extraTexts
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0);
    } catch {
      return [];
    }
  }

  private setRowBusy(id: string, busy: boolean): void {
    this.processingById.update((prev) => {
      return setProcessingId(prev, id, busy);
    });
  }

  private endpoint(path = ''): string {
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/api/commercial-offers${path}`;
  }
}
