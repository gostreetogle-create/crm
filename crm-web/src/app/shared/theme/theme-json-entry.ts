/**
 * JSON entry point для дизайнера.
 *
 * Логика:
 * - при старте приложения, если в `localStorage` нет кастомной темы (или она равна дефолту),
 *   будет применён этот JSON.
 * - чтобы увидеть изменения, обычно достаточно пересобрать фронт и перезайти на страницу.
 *
 * Вставляй сюда JSON формата `ThemeTokens` (как в `theme-schema.ts`).
 */
export const THEME_JSON_ENTRY_RAW = `{
  "name": "blueprint",
  "fontFamilyBase": "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  "textPrimary": "#101828",
  "textMuted": "rgba(16, 24, 40, 0.72)",
  "bgBase": "#f4f6fa",
  "bgGradientA": "rgba(31, 111, 235, 0.08)",
  "bgGradientB": "rgba(14, 159, 110, 0.08)",
  "surface": "rgba(255, 255, 255, 0.96)",
  "surfaceSoft": "rgba(249, 250, 251, 0.95)",
  "borderColor": "rgba(16, 24, 40, 0.14)",
  "shadowColor": "rgba(16, 24, 40, 0.04)",
  "accent": "#1f6feb",
  "success": "#0e9f6e",
  "danger": "#dc2626",
  "radiusCard": "4px",
  "radiusPill": "4px"
}`;

