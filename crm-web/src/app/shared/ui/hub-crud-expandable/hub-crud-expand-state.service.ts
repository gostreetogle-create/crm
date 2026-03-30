import { Injectable, signal } from '@angular/core';

/**
 * Состояние раскрытия таблицы по плитке хаба / demo (ключ — стабильный id плитки).
 */
@Injectable({ providedIn: 'root' })
export class HubCrudExpandStateService {
  private readonly _state = signal<Record<string, boolean>>({});

  /** Readonly-снимок для `computed()` в компонентах (реагирует на раскрытие). */
  readonly expandState = this._state.asReadonly();

  isOpen(key: string): boolean {
    return this._state()[key] ?? false;
  }

  /**
   * Лимит высоты тела таблицы в развёрнутой плитке на узких/средних вьюпортах (менее 1024px по ширине).
   * На широких экранах тот же вход передаётся в `crud-layout`, но стили снимают max-height —
   * список виден целиком в плитке, прокрутка у страницы (один канон, без второй разновидности карточки).
   */
  readonly expandedTableBodyMaxHeight = 'min(72vh, 34rem)';

  /** В свёрнутой плитке — одна строка превью; при раскрытии — без лимита строк. */
  previewMaxTableBodyRows(tileKey: string): number | null {
    return this.isOpen(tileKey) ? null : 1;
  }

  /**
   * Свёрнуто: без ограничения высоты обёртки (видна одна строка за счёт maxTableBodyRows).
   * Развёрнуто: передаём cap в `crud-layout` (на широком экране его перекрывает media query в компоненте).
   */
  previewTableBodyMaxHeight(tileKey: string): string | null {
    return this.isOpen(tileKey) ? this.expandedTableBodyMaxHeight : null;
  }

  /**
   * Заглушки совместимости: автозакрытие по клику вне карточки отключено.
   * Карточки закрываются только кнопкой «меню / 3 линии».
   */
  registerShellHost(_tileKey: string, _hostElement: HTMLElement): void {
    // no-op
  }

  unregisterShellHost(_tileKey: string): void {
    // no-op
  }

  toggle(key: string): void {
    this._state.update((m) => ({ ...m, [key]: !m[key] }));
  }

  close(key: string): void {
    this._state.update((m) => ({ ...m, [key]: false }));
  }
}
