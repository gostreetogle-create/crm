import { Injectable, signal } from '@angular/core';

/**
 * Цепочка полноэкранных маршрутов «Новый материал» → «Новая характеристика».
 *
 * Нельзя хранить флаги в `DictionariesPage`: при смене child route (`новый-материал` ↔
 * `новая-характеристика-материала`) Angular пересоздаёт компонент — сигналы экземпляра теряются.
 * Этот сервис в `DICTIONARIES_ROUTE_PROVIDERS` живёт на всём дереве `/справочники`.
 */
@Injectable()
export class DictionariesMaterialStandaloneFlowService {
  private readonly chainFromMaterialStandalone = signal(false);
  private readonly pendingMaterialCharacteristicId = signal<string | null>(null);

  /** Вызвать перед `navigate` на полноэкранную характеристику с маршрута «Новый материал». */
  markChainFromMaterialStandalone(): void {
    this.chainFromMaterialStandalone.set(true);
  }

  /**
   * После успешного create характеристики: положить id для подстановки в форму материала после `back()`.
   */
  afterStandaloneCharacteristicSaved(createdId: string): void {
    if (!this.chainFromMaterialStandalone()) return;
    this.pendingMaterialCharacteristicId.set(createdId);
    this.chainFromMaterialStandalone.set(false);
  }

  /** Прочитать и сбросить id после `initNewMaterialStandaloneForm` / сброса формы. */
  consumePendingMaterialCharacteristicId(): string | null {
    const id = this.pendingMaterialCharacteristicId();
    this.pendingMaterialCharacteristicId.set(null);
    return id;
  }

  /** «Назад» без сохранения или сброс нештатный. */
  cancelFlow(): void {
    this.chainFromMaterialStandalone.set(false);
    this.pendingMaterialCharacteristicId.set(null);
  }
}
