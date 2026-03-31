# Название файла: .md — Центр анализа входящих файлов

`analysis_hub/` — рабочая зона для **входящих** файлов на разбор (Excel, CSV, описания полей). Это не долговременное хранилище данных: разобранное уходит в канон, сырьё не копируем.

## Структура

| Путь | Назначение |
|------|------------|
| `analysis_hub/inbox/` | Входящие до разбора; после полного разбора файл **удаляется** отсюда (см. протокол ниже). |
| `docs/backend-map/` | **Источник правды** по аналитической карте данных: [`small_dictionaries.json`](../docs/backend-map/small_dictionaries.json), [`entities_from_dictionaries.json`](../docs/backend-map/entities_from_dictionaries.json), вложенные JSON (например `material_geometry_new_model/`). Подробно: [`docs/backend-map/README.md`](../docs/backend-map/README.md). |

## Протокол обработки

1. Входящие кладутся в `inbox/`.
2. Сверка с текущей схемой в `docs/backend-map/`.
3. Обновление JSON (без дублей смыслов); при необходимости — поднять `version` в затронутом файле.
4. После **полного** разбора — удалить файл из `inbox/`.
5. Если разбор не завершён — файл остаётся в `inbox/`; в отчёте/задаче явно пометить **«не проанализирован до конца»** (см. правила репозитория про `analysis_hub/inbox/` — не оставлять «полуразобранное» без пометки).

После изменения любого `*.json` в `docs/backend-map/` из корня репозитория:

```bash
node scripts/generate-backend-map-overview.cjs
```

и закоммитить обновлённый `docs/backend-map/OVERVIEW.generated.md` — см. [`docs/backend-map/README.md`](../docs/backend-map/README.md).

## Связь с продуктом (UI)

- Пользовательский хаб справочников в приложении: [`docs/frontend/dictionaries-crud-playbook.md`](../docs/frontend/dictionaries-crud-playbook.md).
