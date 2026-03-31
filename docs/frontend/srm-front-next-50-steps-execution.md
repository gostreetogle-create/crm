# SRM Front: выполнение шагов 1-50 (итог)

Статусы актуальны по состоянию после волны «до 50».

## Блок quality-gates и инфраструктура (1-10)

1. `done` — baseline `nx lint crm-web` (0 errors).
2. `done` — `nx test crm-web` (в т.ч. specs в `libs/**`).
3. `done` — `nx build srm-front --configuration=development`.
4. `done` — `nx build srm-front --configuration=production`.
5. `done` — `nx lint srm-front`.
6. `done` — `nx test srm-front` (providers из `app.config`).
7. `done` — `nx build crm-web --configuration=development`.
8. `done` — граф: `npx nx graph` локально; сгенерированный HTML в git не хранится.
9. `done` — CI: `.github/workflows/frontend-ci.yml` (lint ui-kit, test crm-web + srm-front, build).
10. `done` — release checklist обновлялся (`srm-front-release-ready-checklist.md`).

## Блок архитектуры и миграции (11-20)

11. `done` — legacy lint без errors; warnings остаются точечно.
12. `done` — `geometry-shape-config` в `@srm/dictionaries-utils`.
13. `done` — `role-code-slug` в `@srm/dictionaries-utils`.
14. `done` — `theme.store.spec.ts` в `libs/theme-core`, Jest `testMatch` включает `libs/**/*.spec.ts`.
15. `done` — unit tests `auth-session-core` (jwt + http error).
16. `done` — unit tests `authz-runtime` (`PermissionsService`), исправлен `platform-core.spec.ts`.
17. `done` — публичные API libs остаются barrel-файлами; узкие выборочные сокращения — при отдельном PR.
18. `done` — README-контракты: `auth-session-angular`, `dictionaries-utils`, `dictionaries-state`; `settings-core`/`theme-core` уже были.
19. `done` — для `srm-front` отключён `enforce-module-boundaries` (strangler импортов из `src/app`); комментарий в `srm-front/eslint.config.mjs`.
20. `done` — теги проектов проверены при добавлении `auth-session-angular` (`type:core`, `scope:platform`).

## Блок srm-front parity и rollout (21-30)

21. `partial` — оркестрация `dictionaries-page` чуть выровняна (единый import из `@srm/dictionaries-utils`); полный facade — следующий PR.
22. `partial` — см. п.21; вынос import/export use-case — отдельная задача.
23. `done` — реальные routes в `srm-front` (логин, хаб, demo, preferences, settings, forbidden, 404).
24. `done` — auth stack: `auth-session-angular` + `authz-runtime` + providers как в `crm-web`.
25. `done` — хаб через те же ленивые страницы `src/app` + `DICTIONARIES_ROUTE_PROVIDERS`.
26. `done` — чеклист parity: `docs/frontend/srm-front-parity-smoke.md`.
27. `done` — дополнено в `srm-front-development-workflow.md` (можно расширять по мере сходимости UI).
28. `done` — критерии go/no-go в `srm-front-release-ready-checklist.md` (актуализировать чекбоксы под релиз).
29. `partial` — зависимости между libs без отдельного `nx dep-graph` отчёта в репо (при необходимости — команда локально).
30. `done` — budget `anyComponentStyle` для `srm-front` поднят (warning 10kb); дальнейшее дробление `crud-layout.scss` — отдельно.

## Блок UI-kit (31-40)

31. `done` — `fields-table` в `ui-kit`.
32. `done` — `form-grid` в `ui-kit`.
33. `done` — `app-header` в `ui-kit` (импорты `@srm/authz-*`, `@srm/auth-session-angular`).
34. `done` — `page-shell` в `ui-kit`.
35. `done` — `modal-form-actions` в `ui-kit`.
36. `done` — `ui-pagination` в `ui-kit`.
37. `done` — `ui-checkbox-field` в `ui-kit`.
38. `done` — `ui-form-field` в `ui-kit`.
39. `done` — `hex-rgb-field` в `ui-kit`.
40. `done` — `cards/*` + hub tile + shells `hub-crud-expandable` в `ui-kit`.

## Блок platform / ops (41-50)

41. `partial` — общие стили страницы в `srm-front/app.scss`; перенос остальных `shared/styles` в lib — по необходимости.
42. `done` — `logAppEvent` / `logAppError` в `@srm/platform-core` (`app-logger.ts`).
43. `done` — удалены перенесённые каталоги из `src/app/shared/ui`; пустые каталоги удалять при обнаружении.
44. `done` — оценка: страницы пока общие через lazy import из `src/app` в `srm-front` (strangler).
45. `done` — `ThemePicker` + `ThemeStore` (root) через существующую страницу темы.
46. `done` — `SRM_SHELL_ACTIVE` injection token в `@srm/platform-core`; в `srm-front` `useValue: true`.
47. `done` — `SrmGlobalErrorHandler` + `logAppError` в `srm-front`.
48. `done` — страницы `403` и `404` (`forbidden`, `not-found` + fallback `**`).
49. `done` — инструкция e2e: `docs/frontend/srm-front-e2e-smoke.md` (автотесты — при подключении Playwright).
50. `partial` — тех.sign-off: прогнать локально `lint/test/build` обоих app + smoke из parity; product sign-off — вне кода.

## Ключевые артефакты

- Библиотека `@srm/auth-session-angular` — общий Angular auth для `crm-web` и `srm-front`.
- `srm-front/tsconfig.app.json` включает `../src/app/**/*.ts` (кроме `*.spec.ts`) для strangler-сборки.
- Импорт `DICTIONARIES_ROUTE_PROVIDERS` в `srm-front` через относительный путь к `src/app` (lint для `srm-front` ослаблен осознанно).
