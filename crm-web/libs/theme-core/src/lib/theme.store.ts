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
import { THEME_JSON_ENTRY_RAW } from './theme-json-entry';
import { defaultTheme, THEME_PRESETS } from './theme-presets';
import { ThemeTokens } from './theme-schema';

export type ThemeState = {
  theme: ThemeTokens;
  preset: string;
  isDirty: boolean;
};

const STORAGE_KEY = 'crm-web.theme.tokens.v1';

const AVAILABLE_THEME_NAMES = new Set(['light', 'dark']);

function isDarkHexColor(value: string): boolean {
  if (!value.startsWith('#')) return false;
  const hex = value.slice(1);
  if (hex.length !== 6) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  // relative luminance (sRGB)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.5;
}

function normalizeTheme(theme: ThemeTokens): ThemeTokens {
  if (AVAILABLE_THEME_NAMES.has(theme.name)) return theme;
  const name = isDarkHexColor(theme.bgBase) ? 'dark' : 'light';
  return { ...theme, name };
}

function applyThemeToCssVars(theme: ThemeTokens): void {
  const root = document.documentElement.style;
  root.setProperty('--font-family-base', theme.fontFamilyBase);
  root.setProperty('--font-size-base', theme.fontSizeBase);
  root.setProperty('--font-size-label', theme.fontSizeLabel);
  root.setProperty('--font-size-small', theme.fontSizeSmall);
  root.setProperty('--font-size-card-title', theme.fontSizeCardTitle);
  root.setProperty('--font-size-page-title', theme.fontSizePageTitle);
  root.setProperty('--text-primary', theme.textPrimary);
  root.setProperty('--text-muted', theme.textMuted);
  root.setProperty('--font-size-control', theme.fontSizeBase);
  root.setProperty('--text-form-label', theme.textMuted);
  root.setProperty('--bg-base', theme.bgBase);
  root.setProperty('--bg-gradient-a', theme.bgGradientA);
  root.setProperty('--bg-gradient-b', theme.bgGradientB);
  root.setProperty('--surface', theme.surface);
  root.setProperty('--surface-soft', theme.surfaceSoft);
  root.setProperty('--border-color', theme.borderColor);
  root.setProperty('--shadow-color', theme.shadowColor);
  root.setProperty('--accent', theme.accent);
  root.setProperty('--success', theme.success);
  root.setProperty('--icon-affirm', theme.iconAffirm);
  root.setProperty('--icon-accent', theme.iconAccent);
  root.setProperty('--icon-muted', theme.iconMuted);
  root.setProperty('--icon-warning', theme.iconWarning);
  root.setProperty('--icon-danger', theme.iconDanger);
  root.setProperty('--danger', theme.danger);
  root.setProperty('--warning', theme.warning);
  root.setProperty('--ui-input-padding-y', theme.uiInputPaddingY);
  root.setProperty('--ui-input-padding-x', theme.uiInputPaddingX);
  root.setProperty('--ui-button-padding-y', theme.uiButtonPaddingY);
  root.setProperty('--ui-button-padding-x', theme.uiButtonPaddingX);
  root.setProperty('--ui-button-primary-bg', theme.uiButtonPrimaryBg);
  root.setProperty('--ui-button-primary-text', theme.uiButtonPrimaryText);
  root.setProperty('--ui-button-primary-border-color', theme.uiButtonPrimaryBorderColor);
  root.setProperty('--ui-button-soft-bg', theme.uiButtonSoftBg);
  root.setProperty('--ui-button-soft-text', theme.uiButtonSoftText);
  root.setProperty('--ui-button-soft-border-color', theme.uiButtonSoftBorderColor);
  root.setProperty('--ui-card-padding', theme.uiCardPadding);
  root.setProperty('--ui-card-margin-top', theme.uiCardMarginTop);
  root.setProperty('--ui-card-title-margin-bottom', theme.uiCardTitleMarginBottom);
  root.setProperty('--ui-fact-padding-y', theme.uiFactPaddingY);
  root.setProperty('--ui-fact-padding-x', theme.uiFactPaddingX);
  root.setProperty('--ui-fact-label-font-size', theme.uiFactLabelFontSize);
  root.setProperty('--ui-table-head-padding-y', theme.uiTableHeadPaddingY);
  root.setProperty('--ui-table-head-padding-x', theme.uiTableHeadPaddingX);
  root.setProperty('--ui-table-cell-padding-y', theme.uiTableCellPaddingY);
  root.setProperty('--ui-table-cell-padding-x', theme.uiTableCellPaddingX);
  root.setProperty('--ui-table-head-font-size', theme.uiTableHeadFontSize);
  root.setProperty('--ui-table-cell-font-size', theme.uiTableCellFontSize);
  root.setProperty('--ui-modal-backdrop-padding', theme.uiModalBackdropPadding);
  root.setProperty('--ui-modal-header-padding-y', theme.uiModalHeaderPaddingY);
  root.setProperty('--ui-modal-header-padding-x', theme.uiModalHeaderPaddingX);
  root.setProperty('--ui-modal-title-font-size', theme.uiModalTitleFontSize);
  root.setProperty('--ui-modal-content-padding', theme.uiModalContentPadding);
  root.setProperty('--ui-modal-actions-padding-top', theme.uiModalActionsPaddingTop);
  root.setProperty('--ui-modal-actions-padding-x', theme.uiModalActionsPaddingX);
  root.setProperty('--ui-modal-actions-padding-bottom', theme.uiModalActionsPaddingBottom);
  root.setProperty('--ui-app-header-padding-y', theme.uiAppHeaderPaddingY);
  root.setProperty('--ui-app-header-padding-x', theme.uiAppHeaderPaddingX);
  root.setProperty('--ui-nav-gap', theme.uiNavGap);
  root.setProperty('--ui-nav-link-padding-y', theme.uiNavLinkPaddingY);
  root.setProperty('--ui-nav-link-padding-x', theme.uiNavLinkPaddingX);
  root.setProperty('--ui-page-shell-padding-top', theme.uiPageShellPaddingTop);
  root.setProperty('--ui-page-shell-padding-x', theme.uiPageShellPaddingX);
  root.setProperty('--ui-page-shell-padding-bottom', theme.uiPageShellPaddingBottom);
  root.setProperty('--ui-space-1', theme.uiSpace1);
  root.setProperty('--ui-space-2', theme.uiSpace2);
  root.setProperty('--ui-space-3', theme.uiSpace3);
  root.setProperty('--ui-space-4', theme.uiSpace4);
  root.setProperty('--ui-row-action-btn-radius', theme.uiRowActionBtnRadius);
  root.setProperty('--ui-shadow-card-offset-y', theme.uiShadowCardOffsetY);
  root.setProperty('--ui-shadow-card-blur', theme.uiShadowCardBlur);
  root.setProperty('--ui-shadow-card-thin-offset-y', theme.uiShadowCardThinOffsetY);
  root.setProperty('--ui-space-0p5', theme.uiSpace0p5);
  root.setProperty('--ui-space-7', theme.uiSpace7);
  root.setProperty('--ui-space-14', theme.uiSpace14);
  root.setProperty('--ui-space-10', theme.uiSpace10);
  root.setProperty('--ui-backdrop-blur-md', theme.uiBackdropBlurMd);
  root.setProperty('--ui-backdrop-blur-sm', theme.uiBackdropBlurSm);
  root.setProperty('--ui-control-min-height', theme.uiControlMinHeight);
  root.setProperty('--ui-theme-picker-min-width', theme.uiThemePickerMinWidth);
  root.setProperty('--ui-crud-actions-col-width', theme.uiCrudActionsColWidth);
  root.setProperty('--ui-crud-card-label-width', theme.uiCrudCardLabelWidth);
  root.setProperty('--ui-modal-shadow-offset-y', theme.uiModalShadowOffsetY);
  root.setProperty('--ui-modal-shadow-blur', theme.uiModalShadowBlur);
  root.setProperty('--radius-card', theme.radiusCard);
  root.setProperty('--radius-pill', theme.radiusPill);
}

function readThemeFromStorage(): ThemeTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ThemeTokens>;
    return { ...defaultTheme, ...parsed };
  } catch {
    return null;
  }
}

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
    const saved = readThemeFromStorage();
    if (saved) {
      const normalized = normalizeTheme(saved);
      patchState(store, { theme: normalized, preset: normalized.name, isDirty: false });
    } else {
      const parsedEntry = parseThemeJson(THEME_JSON_ENTRY_RAW);
      if (parsedEntry.ok) {
        const normalized = normalizeTheme(parsedEntry.theme);
        patchState(store, {
          theme: normalized,
          preset: normalized.name,
          isDirty: false,
        });
      }
    }

    effect(() => {
      const current = store.theme();
      applyThemeToCssVars(current);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
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
        const theme = readThemeFromStorage();
        if (!theme) return;
        const normalized = normalizeTheme(theme);
        patchState(store, { theme: normalized, preset: normalized.name, isDirty: false });
      },
      saveToStorage: () => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(store.theme()));
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
                if (event.key !== STORAGE_KEY) return;
                const theme = readThemeFromStorage();
                if (!theme) return;
                const normalized = normalizeTheme(theme);
                patchState(store, { theme: normalized, preset: normalized.name, isDirty: false });
              })
            )
          )
        )
      ),
      getCurrentTheme: () => store.theme(),
      getCurrentThemeJson: () => store.themeJson(),
    };
  })
);
