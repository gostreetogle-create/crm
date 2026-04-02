import { Injectable, DestroyRef, inject, signal, NgZone } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CLIENTS_REPOSITORY, type ClientItem } from '@srm/clients-data-access';
import { ORGANIZATIONS_REPOSITORY, type OrganizationItem } from '@srm/organizations-data-access';

/**
 * Facade для загрузки справочников КП (организации/контакты).
 * UI компонент только использует сигналы и подписки на форму.
 */
@Injectable({ providedIn: 'root' })
export class KpBuilderFacade {
  private readonly organizationsRepository = inject(ORGANIZATIONS_REPOSITORY);
  private readonly clientsRepository = inject(CLIENTS_REPOSITORY);
  private readonly ngZone = inject(NgZone);

  readonly organizations = signal<OrganizationItem[]>([]);
  readonly clients = signal<ClientItem[]>([]);

  init(destroyRef: DestroyRef): void {
    this.organizationsRepository
      .getItems()
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((items) => {
        // Некоторые источники данных могут эмитить вне Angular zone.
        // Чтобы UI корректно перерисовывался без пользовательского клика,
        // гарантируем обновление сигналов внутри `NgZone.run`.
        this.ngZone.run(() => {
          this.organizations.set(items.filter((o) => o.isActive));
        });
      });

    this.clientsRepository
      .getItems()
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((items) => {
        this.ngZone.run(() => {
          this.clients.set(items.filter((c) => c.isActive));
        });
      });
  }
}

