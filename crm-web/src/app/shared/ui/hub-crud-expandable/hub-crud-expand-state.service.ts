import { Injectable, signal } from '@angular/core';

/**
 * Состояние раскрытия таблицы по плитке хаба / demo (ключ — стабильный id плитки).
 */
@Injectable({ providedIn: 'root' })
export class HubCrudExpandStateService {
  private readonly state = signal<Record<string, boolean>>({});

  isOpen(key: string): boolean {
    return this.state()[key] ?? false;
  }

  toggle(key: string): void {
    this.state.update((m) => ({ ...m, [key]: !m[key] }));
  }
}
