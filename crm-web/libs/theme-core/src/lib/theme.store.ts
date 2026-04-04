import { computed, effect } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { fromEvent, pipe, switchMap, tap } from 'rxjs';
import { applyThemeTokensToDocument } from './apply-theme-to-document';
import { defaultTheme, THEME_PRESETS } from './theme-presets';
import {
  normalizeTheme,
  readThemeFromStorageOrNull,
  THEME_STORAGE_KEY,
} from './theme-persistence';
import { ThemeTokens } from './theme-schema';

export type ThemeState = {
  theme: ThemeTokens;
  preset: string;
  isDirty: boolean;
};

function parseThemeJson(rawJson: string): { ok: true; theme: ThemeTokens } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as Partial<ThemeTokens>;
    const merged: ThemeTokens = { ...defaultTheme, ...parsed };
    if (!merged.name || !merged.fontFamilyBase) {
      return { ok: false, error: 'Missing required fields: name/fontFamilyBase' };
    }
    return { ok: true, theme: merged };
  } catch {
    return { ok: false, error: 'Invalid JSON format' };
  }
}

export const ThemeStore = signalStore(
  { providedIn: 'root' },
  withState<ThemeState>({
    theme: defaultTheme,
    preset: defaultTheme.name,
    isDirty: false,
  }),
  withComputed(({ theme }) => ({
    themeJson: computed(() => JSON.stringify(theme(), null, 2)),
  })),
  withMethods((store) => {
    const saved = readThemeFromStorageOrNull();
    if (saved) {
      const normalized = normalizeTheme(saved);
      patchState(store, { theme: normalized, preset: normalized.name, isDirty: false });
    }

    effect(() => {
      const current = store.theme();
      applyThemeTokensToDocument(current);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(current));
      } catch {
        // no-op: storage can be unavailable
      }
    });

    return {
      applyTheme: (theme: ThemeTokens) => {
        const normalized = normalizeTheme(theme);
        patchState(store, { theme: normalized, preset: normalized.name, isDirty: true });
      },
      applyPreset: (presetName: string) => {
        const preset = THEME_PRESETS.find((p) => p.name === presetName);
        if (!preset) return;
        const normalized = normalizeTheme(preset);
        patchState(store, { theme: normalized, preset: normalized.name, isDirty: true });
      },
      applyThemeFromJson: (rawJson: string): { ok: boolean; error?: string } => {
        const result = parseThemeJson(rawJson);
        if (!result.ok) return { ok: false, error: result.error };
        const normalized = normalizeTheme(result.theme);
        patchState(store, {
          theme: normalized,
          preset: normalized.name,
          isDirty: true,
        });
        return { ok: true };
      },
      loadFromStorage: () => {
        const theme = readThemeFromStorageOrNull();
        if (!theme) return;
        const normalized = normalizeTheme(theme);
        patchState(store, { theme: normalized, preset: normalized.name, isDirty: false });
      },
      saveToStorage: () => {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(store.theme()));
        } catch {
          // no-op
        }
        patchState(store, { isDirty: false });
      },
      syncStorageEvents: rxMethod<void>(
        pipe(
          switchMap(() =>
            fromEvent<StorageEvent>(window, 'storage').pipe(
              tap((event) => {
                if (event.key !== THEME_STORAGE_KEY) return;
                const theme = readThemeFromStorageOrNull();
                if (!theme) return;
                const normalized = normalizeTheme(theme);
                patchState(store, { theme: normalized, preset: normalized.name, isDirty: false });
              }),
            ),
          ),
        ),
      ),
      getCurrentTheme: () => store.theme(),
      getCurrentThemeJson: () => store.themeJson(),
    };
  }),
);
