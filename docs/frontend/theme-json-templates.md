# Theme JSON templates

Формат JSON для темы (вставляется в `crm-web/src/app/shared/theme/theme-json-entry.ts`):

```json
{
  "name": "custom-theme",
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
}
```

## Шаблоны (presets)

- `blueprint`
- `graphite`
- `sand`

Они доступны в UI через `ThemePicker` (правый верхний угол).

## Поток работы с дизайнером

1. Скопировать текущий JSON из `theme-json-entry.ts` и отдать дизайнеру.
2. Получить правки JSON.
3. Вставить JSON в `theme-json-entry.ts`.
4. Пересобрать фронт (`nx build crm-web`) и проверить UI.
5. Зафиксировать изменения в docs/коде.

