import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ThemeStore } from './theme.store';
import { THEME_PRESETS } from './theme-presets';
import { ThemeTokens } from './theme-schema';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly store = inject(ThemeStore);

  readonly presets = THEME_PRESETS;
  readonly theme$ = toObservable(this.store['theme']);

  constructor() {
    this.store['loadFromStorage']();
    this.store['syncStorageEvents']();
  }

  getCurrentTheme(): ThemeTokens {
    return this.store['getCurrentTheme']();
  }

  getCurrentThemeJson(): string {
    return this.store['getCurrentThemeJson']();
  }

  applyTheme(theme: ThemeTokens): void {
    console.warn('ThemeService deprecated — use ThemeStore');
    this.store['applyTheme'](theme);
  }

  applyThemeFromJson(rawJson: string): { ok: boolean; error?: string } {
    console.warn('ThemeService deprecated — use ThemeStore');
    return this.store['applyThemeFromJson'](rawJson);
  }
}

