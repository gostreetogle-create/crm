# Colors (RAL) CRUD

Цель: справочник `Цвета (RAL)` как единый источник выбора цвета для материалов.

## Где подключено

- Экран: `/dictionaries` (`src/app/features/dictionaries/pages/dictionaries-page/`).
- Провайдеры route: `src/app/app.routes.ts` (внутри `path: 'dictionaries'`).

## API-контракт (готов к backend)

- Модель: `src/app/features/colors/model/color-item.ts`
- Репозиторий: `src/app/features/colors/data/colors.repository.ts`
- Store: `src/app/features/colors/state/colors.store.ts`

Ключевые поля:

- `ralCode` (пример: `RAL 7035`)
- `name`
- `hex`, `rgb`

## Интеграция с материалами

В форме материала:

- выбор цвета через dropdown из `ColorsStore.options()`,
- quick-add кнопка `+` открывает модалку создания цвета,
- после quick-add выбранный цвет автоматически подставляется в материал,
- `colorName` и `colorHex` синхронизируются из справочника,
- для backend отправляется `colorId` (если выбран).

## Импорт/экспорт Excel (frontend)

- Иконки в toolbar: шаблон/импорт/экспорт (с `aria-label` и `title`).
- Кнопка шаблона скачивает `ral-colors-template.xlsx` (2 примерные строки).
- Формат колонок обязателен: `RAL | Название | HEX | RGB`.
- Проверки при импорте:
  - все 4 колонки присутствуют;
  - обязательные значения не пустые;
  - `HEX` строго `#RRGGBB`;
  - `RGB` строго `R,G,B`;
  - `RGB` должен совпадать с `HEX`.
- При ошибках импорт не применяется и показывается причина.

## Напоминание для backend

- Чеклист интеграции: `docs/frontend/backend-ral-colors-checklist.md`.
