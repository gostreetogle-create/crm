# Theme change runbook (CRM web)

**Audience:** developers and AI agents. **Goal:** change colors, density, typography, or page background **without** duplicating sources or breaking hydration.

This document is the **authoritative** procedure. Shorter JSON notes live in [`theme-json-templates.md`](./theme-json-templates.md).

---

## 1. Invariants (do not violate)

1. **Single source of token *values* (in repo):** `crm-web/libs/theme-core/src/lib/theme-presets.ts` — object `THEME_PRESETS`, and `defaultTheme` (preset named **`light`**).
2. **Single source of token *shape*:** `crm-web/libs/theme-core/src/lib/theme-schema.ts` — type `ThemeTokens`. Every preset must satisfy this type.
3. **Single function that writes theme → CSS variables:** `crm-web/libs/theme-core/src/lib/apply-theme-to-document.ts` → `applyThemeTokensToDocument(theme)`.
4. **Runtime wiring:**
   - `crm-web/src/main.ts` calls `applyThemeTokensToDocument(resolveActiveThemeFromStorage())` **before** `bootstrapApplication` (first paint + `localStorage` restore).
   - `crm-web/libs/theme-core/src/lib/theme.store.ts` (`ThemeStore`) applies the active theme on every change and persists to `localStorage`.
5. **`crm-web/src/styles.scss`:** only variables **not** part of `ThemeTokens`, plus **fallbacks** inside `var(--x, fallback)` for pre-JS / `calc()`. **Do not** copy full theme maps into `:root` here.

If you add a new field to `ThemeTokens`, you **must** update: `theme-schema.ts`, **every** object in `THEME_PRESETS`, `apply-theme-to-document.ts`, and optionally fallbacks in `styles.scss` if something references it before JS runs.

---

## 2. Mental model (data flow)

```
theme-presets.ts (light / dark / …)
        │
        ├─► defaultTheme (= light)  ──► merge with localStorage if present
        │
        ▼
applyThemeTokensToDocument(theme)  ──►  document.documentElement.style (--font-*, --accent, …)
        ▲
        │
ThemeStore (Angular) + main.ts first call
```

Browser storage key: **`crm-web.theme.tokens.v1`**. Stored value is JSON; it is **merged** with `defaultTheme` so missing keys still work after schema updates.

---

## 3. Choose your scenario

| Goal | What to edit |
|------|----------------|
| **Default look for all new users / repo default** | Preset **`light`** in `theme-presets.ts` (this is `defaultTheme`). |
| **Dark mode look** | Preset **`dark`** in `theme-presets.ts`. |
| **Try changes only on your machine** | Theme Studio in the app, or paste JSON via `applyThemeFromJson`, or edit `localStorage` key (see §7). |
| **Ship a new built-in palette** | Add object to `THEME_PRESETS`; if it should appear in the header picker, also update the filter in `theme-picker.component.ts` / `theme-studio` (they currently expose only `light` and `dark`). |
| **New CSS variable backed by theme** | Extend `ThemeTokens` + all presets + `applyThemeTokensToDocument` (§6). |

---

## 4. Procedure: change existing preset (`light` or `dark`)

### 4.1 Edit values

1. Open `crm-web/libs/theme-core/src/lib/theme-presets.ts`.
2. Locate the preset by `name: 'light'` or `name: 'dark'`.
3. Change only keys that exist on `ThemeTokens` (see `theme-schema.ts`). Examples:
   - **Primary / links / actions:** `accent`, `iconAccent`
   - **Page background:** `bgBase`, `pageShellBgBottom`, `bgGradientA`, `bgGradientB`
   - **Surfaces / borders:** `surface`, `surfaceSoft`, `borderColor`, `shadowColor`
   - **Text:** `textPrimary`, `textMuted`
   - **Buttons:** `uiButtonPrimaryBg`, `uiButtonPrimaryText`, `uiButtonPrimaryBorderColor`, `uiButtonSoft*`
   - **Density:** `fontSizeBase`, `uiControlMinHeight`, `uiButtonPaddingY`, `uiSpace1`…`uiSpace4`, table paddings, etc.

### 4.2 Fonts

If `fontFamilyBase` references a **web font**, add the font to `crm-web/src/index.html` (Google Fonts or self-hosted). Otherwise the stack falls through to system fonts.

### 4.3 Keep `styles.scss` fallbacks honest (optional but recommended)

If you change common tokens (e.g. `accent`, `bgBase`, `font-size-base` scale), update the **fallback** literals inside `var(..., fallback)` in `crm-web/src/styles.scss` so the first paint before/without JS still looks close to the new preset.

### 4.4 Verify

1. Clear `localStorage` key `crm-web.theme.tokens.v1` **or** re-apply the preset from the UI so you are not testing an old saved override.
2. Run the app; toggle **light** / **dark** if you changed both.
3. Smoke-test: header, primary button, soft button, form field, table header, modal, page background (`page-shell`).

### 4.5 Commit

Commit `theme-presets.ts` and any `styles.scss` / `index.html` updates together with a short message describing the visual intent.

---

## 5. Procedure: experiment locally (no repo change yet)

1. Use in-app **Theme Studio** (if available in your build) or any UI that calls `ThemeStore.applyThemeFromJson`.
2. Paste a **partial** JSON object; missing keys are filled from `defaultTheme`.
3. To discard experiments: remove `crm-web.theme.tokens.v1` from DevTools → Application → Local Storage, then reload.

**Note:** `name` in JSON is normalized: only `light` and `dark` are kept as-is for the picker; other names may be coerced to `light` or `dark` based on background luminance (`theme-persistence.ts`).

---

## 6. Procedure: add a new `ThemeTokens` field

1. **`theme-schema.ts`** — add the property with a short comment.
2. **`theme-presets.ts`** — add the property to **every** preset object (`blueprint`, `dark`, `sand`, `light`, …).
3. **`apply-theme-to-document.ts`** — add one `root.setProperty('--kebab-case-name', theme.newField)`.
4. **Use in UI** — reference `var(--kebab-case-name)` in SCSS or components.
5. **`styles.scss`** — only if some global `calc()` or body rule needs a fallback; otherwise skip.

Run TypeScript build/tests: `nx run theme-core:test` (or full `nx build crm-web`) to catch incomplete presets.

---

## 7. `localStorage` reference

- **Key:** `crm-web.theme.tokens.v1`
- **Value:** JSON object, merged with `defaultTheme` on read (`readStoredThemeMerged` / `readThemeFromStorageOrNull` in `theme-persistence.ts`).
- **First paint:** `main.ts` uses `resolveActiveThemeFromStorage()` so stored theme applies before Angular bootstraps.

---

## 8. Anti-patterns (reject in review)

- Duplicating theme colors or spacing in `styles.scss` `:root` without a fallback-only reason.
- Adding a second JSON file in the repo that merges on startup (removed by design).
- Hardcoding hex colors in feature libraries instead of `var(--...)`.
- Editing only one preset and leaving others missing a new `ThemeTokens` field (TypeScript should fail).

---

## 9. Quick file index

| File | Responsibility |
|------|----------------|
| `crm-web/libs/theme-core/src/lib/theme-schema.ts` | `ThemeTokens` type |
| `crm-web/libs/theme-core/src/lib/theme-presets.ts` | Preset values, `defaultTheme` |
| `crm-web/libs/theme-core/src/lib/apply-theme-to-document.ts` | Map tokens → CSS variables |
| `crm-web/libs/theme-core/src/lib/theme-persistence.ts` | Storage key, merge, `normalizeTheme`, `resolveActiveThemeFromStorage` |
| `crm-web/libs/theme-core/src/lib/theme.store.ts` | Angular state, persistence, `applyThemeFromJson` |
| `crm-web/src/main.ts` | Early `applyThemeTokensToDocument` |
| `crm-web/src/styles.scss` | Non-token globals + fallbacks |
| `crm-web/libs/ui-kit/src/lib/page-shell/page-shell.component.scss` | Page background layers (`--page-shell-bg-bottom`, gradients) |
| `crm-web/src/index.html` | Web fonts |

---

## 10. For AI agents: execution checklist

When the user asks to “change the theme”:

1. Read **`theme-schema.ts`** for allowed keys.
2. Apply changes to **`theme-presets.ts`** for the relevant preset(s) (`light` / `dark`).
3. If any new key was added, update **`apply-theme-to-document.ts`** and **all** presets.
4. If web font changed, update **`index.html`**.
5. Align **`styles.scss`** fallbacks if defaults shifted materially.
6. Do **not** reintroduce a parallel JSON entry file; use Theme Store / `localStorage` only for experiments.
7. Suggest clearing **`crm-web.theme.tokens.v1`** to verify default preset behavior.

End of runbook.
