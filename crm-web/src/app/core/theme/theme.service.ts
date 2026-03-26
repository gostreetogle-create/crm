import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { defaultTheme, THEME_PRESETS } from '../../shared/theme/theme-presets';
import { THEME_JSON_ENTRY_RAW } from '../../shared/theme/theme-json-entry';
import { ThemeTokens } from '../../shared/theme/theme-schema';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'crm-web.theme.tokens.v1';

  readonly presets = THEME_PRESETS;
  private currentTheme: ThemeTokens = defaultTheme;
  private readonly themeSubject = new BehaviorSubject<ThemeTokens>(defaultTheme);
  readonly theme$ = this.themeSubject.asObservable();

  constructor() {
    const saved = this.readThemeFromStorage();

    // Если пользователь не менял тему (хранится дефолт) или темы ещё нет —
    // применяем дизайнерский JSON entry из проекта.
    if (!saved) {
      const entryRes = this.applyThemeFromJson(THEME_JSON_ENTRY_RAW);
      if (!entryRes.ok) this.applyTheme(defaultTheme);
      return;
    }

    if (this.isThemeEqual(saved, defaultTheme)) {
      const entryRes = this.applyThemeFromJson(THEME_JSON_ENTRY_RAW);
      if (!entryRes.ok) this.applyTheme(defaultTheme);
      return;
    }

    // Иначе оставляем пользовательскую/выбранную тему.
    this.applyTheme(saved);
  }

  getCurrentTheme(): ThemeTokens {
    return this.currentTheme;
  }

  getCurrentThemeJson(): string {
    return JSON.stringify(this.currentTheme, null, 2);
  }

  applyTheme(theme: ThemeTokens): void {
    this.currentTheme = theme;
    this.themeSubject.next(theme);
    const root = document.documentElement.style;

    root.setProperty('--font-family-base', theme.fontFamilyBase);
    root.setProperty('--text-primary', theme.textPrimary);
    root.setProperty('--text-muted', theme.textMuted);

    root.setProperty('--bg-base', theme.bgBase);
    root.setProperty('--bg-gradient-a', theme.bgGradientA);
    root.setProperty('--bg-gradient-b', theme.bgGradientB);
    root.setProperty('--surface', theme.surface);
    root.setProperty('--surface-soft', theme.surfaceSoft);
    root.setProperty('--border-color', theme.borderColor);
    root.setProperty('--shadow-color', theme.shadowColor);

    root.setProperty('--accent', theme.accent);
    root.setProperty('--success', theme.success);
    root.setProperty('--danger', theme.danger);

    root.setProperty('--radius-card', theme.radiusCard);
    root.setProperty('--radius-pill', theme.radiusPill);

    this.saveThemeToStorage(theme);
  }

  applyThemeFromJson(rawJson: string): { ok: boolean; error?: string } {
    try {
      const parsed = JSON.parse(rawJson) as Partial<ThemeTokens>;
      const merged: ThemeTokens = { ...defaultTheme, ...parsed };
      if (!merged.name || !merged.fontFamilyBase) {
        return { ok: false, error: 'Missing required fields: name/fontFamilyBase' };
      }
      this.applyTheme(merged);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Invalid JSON format' };
    }
  }

  private saveThemeToStorage(theme: ThemeTokens): void {
    try {
      localStorage.setItem(ThemeService.STORAGE_KEY, JSON.stringify(theme));
    } catch {
      // no-op: storage can be unavailable in restricted browser contexts
    }
  }

  private readThemeFromStorage(): ThemeTokens | null {
    try {
      const raw = localStorage.getItem(ThemeService.STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<ThemeTokens>;
      return { ...defaultTheme, ...parsed };
    } catch {
      return null;
    }
  }

  private isThemeEqual(a: ThemeTokens, b: ThemeTokens): boolean {
    return (
      a.name === b.name &&
      a.fontFamilyBase === b.fontFamilyBase &&
      a.textPrimary === b.textPrimary &&
      a.textMuted === b.textMuted &&
      a.bgBase === b.bgBase &&
      a.bgGradientA === b.bgGradientA &&
      a.bgGradientB === b.bgGradientB &&
      a.surface === b.surface &&
      a.surfaceSoft === b.surfaceSoft &&
      a.borderColor === b.borderColor &&
      a.shadowColor === b.shadowColor &&
      a.accent === b.accent &&
      a.success === b.success &&
      a.danger === b.danger &&
      a.radiusCard === b.radiusCard &&
      a.radiusPill === b.radiusPill
    );
  }
}

