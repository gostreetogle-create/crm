import { defaultTheme } from './theme-presets';
import { ThemeTokens } from './theme-schema';

/** Ключ хранилища — один на всё приложение */
export const THEME_STORAGE_KEY = 'crm-web.theme.tokens.v1';

const AVAILABLE_THEME_NAMES = new Set(['light', 'dark']);

function isDarkHexColor(value: string): boolean {
  if (!value.startsWith('#')) return false;
  const hex = value.slice(1);
  if (hex.length !== 6) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.5;
}

/** Имена пресетов только light/dark; иначе подмена по яркости фона (для переключателя). */
export function normalizeTheme(theme: ThemeTokens): ThemeTokens {
  if (AVAILABLE_THEME_NAMES.has(theme.name)) return theme;
  const name = isDarkHexColor(theme.bgBase) ? 'dark' : 'light';
  return { ...theme, name };
}

/** Слияние с дефолтом — недостающие поля после смены схемы не ломают приложение */
export function readStoredThemeMerged(): ThemeTokens {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return defaultTheme;
    const parsed = JSON.parse(raw) as Partial<ThemeTokens>;
    return { ...defaultTheme, ...parsed };
  } catch {
    return defaultTheme;
  }
}

/** Тема для первого кадра: localStorage или defaultTheme, с нормализацией имени */
export function resolveActiveThemeFromStorage(): ThemeTokens {
  return normalizeTheme(readStoredThemeMerged());
}

/** Как раньше readThemeFromStorage: `null`, если в хранилище ничего нет */
export function readThemeFromStorageOrNull(): ThemeTokens | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ThemeTokens>;
    return { ...defaultTheme, ...parsed };
  } catch {
    return null;
  }
}
