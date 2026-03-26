# Название файла: .md — Единая точка входа в документацию проекта

## Основные разделы

- `docs/01-idea.md` — текущая идея/направление проекта.
- `docs/backend-map/README.md` — правила ведения backend-map.
- `docs/backend-map/OVERVIEW.generated.md` — автогенерируемый табличный обзор JSON-модели.
- `docs/frontend/` — фронтенд-документация (процессы, контракты, структура, UI).
- `docs/frontend/interaction-system.md` — единый стандарт поведения интерфейса (Demo page как эталон).
- `docs/frontend/ui-contract-v1.md` — формальный UI-контракт проекта.
- `docs/frontend/ui-audit-wave1.md` — аудит дубликатов/расхождений UI (волна 1).

## Правило источника правды

- Для аналитической модели бэкенда источник правды только в `docs/backend-map/`.
- `analysis_hub/inbox/` — только входящие файлы для разбора, не каноничное хранилище.

## Обновление табличного обзора

Из корня репозитория:

```bash
node scripts/generate-backend-map-overview.cjs
```

Команда пересобирает `docs/backend-map/OVERVIEW.generated.md` из всех `*.json` в `docs/backend-map/` (включая вложенные папки).

