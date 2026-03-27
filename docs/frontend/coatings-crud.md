# Coatings CRUD

Справочник `Покрытие` хранит технологические покрытия материалов.

## Поля

- `coatingType` — тип покрытия (`Anodizing`, `Powder coating`, `Galvanized` и т.д.)
- `coatingSpec` — спецификация/описание
- `thicknessMicron` — толщина покрытия (мкм), опционально

## Интеграция с материалами

- В форме материала есть dropdown выбора покрытия + кнопка quick-add `+`.
- При выборе подставляются поля `coatingType`, `coatingSpec`, `coatingThicknessMicron`.

## Backend reminder

- Добавить FK в материалах: `coatingId`.
- Проверять существование `coatingId` при create/update материала.
