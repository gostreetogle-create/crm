# Theme JSON (обмен с дизайнером)

**Полная процедура смены темы (репозиторий, пресеты, localStorage, антипаттерны):** [`theme-change-guide.md`](./theme-change-guide.md).

## Один канон значений

- Полный объект темы: **`ThemeTokens`** — `crm-web/libs/theme-core/src/lib/theme-schema.ts`.
- Дефолт приложения (светлая тема): пресет **`light`** в `crm-web/libs/theme-core/src/lib/theme-presets.ts` (`defaultTheme`).
- В рантайме токены пишутся в `document.documentElement` через **`applyThemeTokensToDocument`** (`apply-theme-to-document.ts`); при старте вызывается из **`crm-web/src/main.ts`**, затем **`ThemeStore`** держит состояние и `localStorage`.

Отдельного «второго JSON-файла» в репозитории **нет**: раньше использовался `theme-json-entry.ts` и он расходился с пресетами — удалён.

## Формат JSON

Частичный JSON (любое подмножество полей `ThemeTokens`) можно подать в **`ThemeStore.applyThemeFromJson`**, в Theme Studio или положить в `localStorage` под ключом **`crm-web.theme.tokens.v1`** (полный JSON после слияния с дефолтом).

Пример фрагмента:

```json
{
  "name": "light",
  "accent": "#4f6f82",
  "bgBase": "#f0f1f3",
  "pageShellBgBottom": "linear-gradient(152deg, #faf8f3 0%, #f5f1e8 38%, #f0ede6 58%, #eef1f4 82%, var(--bg-base) 100%)"
}
```

Недостающие поля подставляются из **`defaultTheme`** при слиянии.

## Пресеты в коде

В UI переключатель обычно показывает только **`light`** и **`dark`**. Пресеты **`blueprint`** и **`sand`** остаются в `THEME_PRESETS` для разработки/импорта без отдельного JSON-файла.

## Поток с дизайнером

1. Экспорт текущей темы: JSON из Theme Studio / `ThemeStore` (`getCurrentThemeJson`) или копия объекта пресета из `theme-presets.ts`.
2. Правки — только в рамках полей `Theme-schema.ts`.
3. Зафиксировать изменения в **`theme-presets.ts`** (и при необходимости в документации), пересобрать фронт и проверить UI.
4. Не дублировать значения вручную в `styles.scss`: там остаются только вещи вне `ThemeTokens` и fallback в `var(..., default)`.
