# Название файла: .md — Единая точка входа в документацию проекта

## Основные разделы

- `docs/business-logic-canon.md` — **рабочая книга бизнес-логики** (решения, шаблон для новых тем, задел по реестрам, **слияние с архивом** [crmgenerator_nx](https://github.com/gostreetogle-create/crmgenerator_nx)); точка входа для ИИ и команды.
- `docs/ARCHITECTURE.md` — актуальная архитектура и реализованная бизнес-логика по модулям production/warehouse/supply/КП, правам и стеку.
- `docs/01-idea.md` — текущая идея/направление проекта.
- `docs/backend-map/README.md` — правила ведения backend-map.
- `docs/backend-map/OVERVIEW.generated.md` — автогенерируемый табличный обзор JSON-модели.
- `docs/frontend/` — фронтенд-документация (процессы, контракты, структура, UI).
- `docs/frontend/interaction-system.md` — единый стандарт поведения интерфейса (Demo page как эталон).
- `docs/frontend/ui-contract-v1.md` — формальный UI-контракт проекта.
- `docs/frontend/ui-audit-wave1.md` — аудит дубликатов/расхождений UI (волна 1).
- `docs/frontend/commercial-offers-bl-roadmap.md` — roadmap по устойчивой бизнес-логике КП (статусы, слой сервисов, тесты).
- `docs/frontend/store-migration-checklist.md` — полный чеклист миграции frontend-операций на store/facade слой (P0/P1/P2, smoke, DoD).
- `docs/release-gates.md` — единый минимальный gate перед релизом (critical tests backend + frontend-state).
  - быстрый preflight: `bash deploy/deploy.sh --self-check` (non-blocking, с диагностикой окружения).
- `deploy/README.md` — краткая инструкция по выкладке.
- `deploy/README.detailed.md` — подробная шпаргалка по деплою, runbook и диагностика.
  - `deploy.sh` запускается как `bash deploy/deploy.sh` (из корня) или `bash ./deploy.sh` (из каталога `deploy/`).

## Правило источника правды

- Для аналитической модели бэкенда источник правды только в `docs/backend-map/`.
- `analysis_hub/inbox/` — только входящие файлы для разбора, не каноничное хранилище.

## Обновление табличного обзора

Из корня репозитория:

```bash
node scripts/generate-backend-map-overview.cjs
```

Команда пересобирает `docs/backend-map/OVERVIEW.generated.md` из всех `*.json` в `docs/backend-map/` (включая вложенные папки).

