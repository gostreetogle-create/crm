# Название файла: .md — Входящая папка для файлов на анализ

Клади сюда входные файлы для разбора:

- `.xlsx`, `.xls`, `.csv`
- `.json`, `.txt`, `.md`
- документы с описанием полей / таблиц

## После обработки

- **Полностью разобранные** файлы удаляются из `inbox/` (канон обновляется в `docs/backend-map/*.json`).
- **Неполный** разбор — файл остаётся; в отчёте к задаче укажи статус **«не проанализирован до конца»** и что осталось сделать.

Канон модели: [`docs/backend-map/README.md`](../../docs/backend-map/README.md). Обзор-таблицы: [`docs/backend-map/OVERVIEW.generated.md`](../../docs/backend-map/OVERVIEW.generated.md) (генерация: `node scripts/generate-backend-map-overview.cjs` из корня репозитория).

Общий протокол: [`analysis_hub/README.md`](../README.md).
