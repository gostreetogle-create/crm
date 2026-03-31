# `dictionaries-hub-feature`

Единый хаб справочников (`/справочники`): shell с `router-outlet`, страница `DictionariesPage`, провайдеры store/repository в `DICTIONARIES_ROUTE_PROVIDERS`.

## Ключевые точки входа

| Что | Файл |
|-----|------|
| Shell | `src/lib/pages/dictionaries-shell/dictionaries-shell.ts` |
| Хаб + формы | `src/lib/pages/dictionaries-page/` |
| Провайдеры DI | `src/lib/dictionaries-route.providers.ts` |
| Хаб: конфиг плиток и pure-логика колонок | `src/lib/dictionaries-hub/` (`dictionaries-hub-board.config.ts`, `dictionaries-hub-board.ts`) |
| Реестр quick-create «+» на хабе | `src/lib/dictionaries-hub/dictionaries-hub-quick-create.registry.ts` |
| Канонические URL-сегменты `/справочники/...` | `src/lib/dictionaries-canonical-paths.ts` |
| Полноэкранный create: meta (ключ, path, title) | `src/lib/standalone-dictionary-create.meta.ts` |
| Фабрика child-маршрутов `standaloneCreate` | `src/lib/standalone-dictionary-create.routes.ts` → `buildStandaloneDictionaryCreateChildRoutes()` |
| Закрытие модалки перед `back` из standalone | `src/lib/standalone-dictionary-create.back.ts` → `callStandaloneCloseForKey` |
| Цепочка «материал → характеристика» (route-level state) | `src/lib/dictionaries-material-standalone-flow.service.ts` |
| Оболочка страницы create | `src/lib/components/dictionary-standalone-create-shell/` |
| Полноэкран «новый материал / характеристика» | `src/lib/components/new-material-fullscreen-page/` |

Публичный API: `src/index.ts`.

## Канон документации

`docs/frontend/dictionaries-crud-playbook.md`, `docs/frontend/dictionaries-polish-backlog.md`, `docs/frontend/dictionaries-standalone-manual-checklist.md`, `docs/frontend/dictionaries-regression-scenarios.md`, `docs/frontend/dictionaries-rbac-manual-checklist.md`, `docs/frontend/dictionaries-runtime-notes.md`.
