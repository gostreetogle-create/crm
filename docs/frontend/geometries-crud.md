# Geometries CRUD (`посмотреть / добавить / изменить / удалить`)

Страница `geometries` реализует полный CRUD для справочника геометрий на mock-репозитории.

## Что уже работает

- Посмотреть список геометрий.
- Добавить новую геометрию (inline-форма на странице).
- Изменить существующую запись через UI-диалог (модальное окно).
  - Открытие: кнопка `Изменить` в строке таблицы.
  - Закрытие: кнопка `Отмена`, клик по backdrop, клавиша `Esc`.
- Удалить запись.
- Поля формы: `name`, `shapeKey`, `heightMm`, `lengthMm`, `widthMm`, `diameterMm`, `thicknessMm`, `notes`, `isActive`.
- Базовая валидация:
  - `name` обязательно, минимум 2 символа.
  - Для размеров запрещены отрицательные значения.
  - Условные обязательные поля по типу `shapeKey`:
    - `rectangular` -> `heightMm`, `widthMm`
    - `tube` -> `diameterMm`, `thicknessMm`
    - `plate` -> `lengthMm`, `widthMm`, `thicknessMm`
    - `cylindrical` -> `diameterMm`, `lengthMm`

## Где лежит код

- Модель: `src/app/features/geometries/model/geometry-item.ts`
- Контракт репозитория: `src/app/features/geometries/data/geometries.repository.ts`
- Mock-реализация: `src/app/features/geometries/data/geometries.mock-repository.ts`
- Страница CRUD: `src/app/features/geometries/pages/geometries-crud-page/`
- Роут: `src/app/app.routes.ts` (`/geometries`)
- Кнопки: `UiButtonComponent` (`src/app/shared/ui/ui-button/`)

## Важно

Сейчас используется mock-источник (in-memory), без backend. Подключение реального API делаем по той же схеме адаптера, что и для других справочников.

