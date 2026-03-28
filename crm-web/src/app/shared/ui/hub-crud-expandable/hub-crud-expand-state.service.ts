import { Injectable, signal } from '@angular/core';

/**
 * Состояние раскрытия таблицы по плитке хаба / demo (ключ — стабильный id плитки).
 */
@Injectable({ providedIn: 'root' })
export class HubCrudExpandStateService {
  private readonly _state = signal<Record<string, boolean>>({});

  /** Readonly-снимок для `computed()` в компонентах (реагирует на раскрытие). */
  readonly expandState = this._state.asReadonly();

  private readonly shellHosts = new Map<string, HTMLElement>();
  private shellRegistrationCount = 0;
  private readonly boundDocumentClick = (event: MouseEvent) => this.onDocumentClick(event);

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
   * Регистрация корневого элемента плитки для одного глобального обработчика клика вне плитки.
   */
  registerShellHost(tileKey: string, hostElement: HTMLElement): void {
    this.shellHosts.set(tileKey, hostElement);
    if (this.shellRegistrationCount++ === 0) {
      document.addEventListener('click', this.boundDocumentClick, false);
    }
  }

  unregisterShellHost(tileKey: string): void {
    this.shellHosts.delete(tileKey);
    if (--this.shellRegistrationCount <= 0) {
      this.shellRegistrationCount = 0;
      document.removeEventListener('click', this.boundDocumentClick, false);
    }
  }

  toggle(key: string): void {
    this._state.update((m) => ({ ...m, [key]: !m[key] }));
  }

  close(key: string): void {
    this._state.update((m) => ({ ...m, [key]: false }));
  }

  private onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    const state = this._state();
    for (const key of Object.keys(state)) {
      if (!state[key]) {
        continue;
      }
      const host = this.shellHosts.get(key);
      if (!host) {
        continue;
      }
      if (!host.contains(target)) {
        this.close(key);
      }
    }
  }
}
