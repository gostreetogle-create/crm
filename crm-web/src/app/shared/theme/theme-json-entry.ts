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
  "name": "light",
  "fontFamilyBase": "'Segoe UI', Inter, ui-sans-serif, system-ui, Arial, sans-serif"
}`;

