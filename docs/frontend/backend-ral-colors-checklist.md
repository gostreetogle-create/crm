# Backend Checklist: RAL Colors API

Цель: дать backend-команде готовый чеклист для подключения frontend-справочника `Цвета (RAL)`.

## 1) CRUD endpoints

- [ ] `GET /colors` -> список цветов (`id, ralCode, name, hex, rgb`)
- [ ] `POST /colors` -> создание цвета
- [ ] `PUT /colors/{id}` -> обновление цвета
- [ ] `DELETE /colors/{id}` -> удаление цвета

## 2) Валидация на API

- [ ] `ralCode` обязателен, уникальный в рамках tenant
- [ ] `name` обязателен
- [ ] `hex` обязателен, формат `#RRGGBB`
- [ ] `rgb.r/g/b` обязательны, диапазон `0..255`
- [ ] проверка консистентности `rgb <-> hex` на сервере

## 3) Импорт/экспорт Excel API (будущий этап)

- [ ] `POST /colors/import` (xlsx/xls) c dry-run режимом
- [ ] `GET /colors/export` (xlsx)
- [ ] ответ dry-run с ошибками по строкам (`row`, `field`, `message`)
- [ ] транзакционный импорт (all-or-nothing или режим с отчетом частичных ошибок)

## 4) Интеграция с материалами

- [ ] материал принимает `colorId`
- [ ] `GET /materials` возвращает `colorId` и (опционально) denormalized `colorName/colorHex`
- [ ] проверка FK: `colorId` должен существовать

## 5) Нефункциональные требования

- [ ] аудит изменений справочника цветов (кто/когда/что изменил)
- [ ] пагинация и фильтр по `ralCode`/`name`
- [ ] единые коды ошибок для frontend-обработки
