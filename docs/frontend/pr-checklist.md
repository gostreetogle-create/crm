# PR checklist (обязательный)

Прогонять перед каждым merge/push.

## Блок A: Архитектура

- [ ] Нет route drift между `crm-web` и `srm-front` для `/справочники` и legacy redirects.
- [ ] Общие route-сегменты/контракты вынесены в shared слой, без ручного дублирования.
- [ ] Изменения CRUD-каркаса сделаны через shared шаблон, не точечно в одной плитке.
- [ ] Нет новых "теневых" страниц или неподключенных route-модулей.

## Блок B: Field contracts

- [ ] Form/table/payload используют согласованные имена и типы полей.
- [ ] Критичные дефекты покрыты тестом или fail-fast gate в CI.
- [ ] Любые временные отклонения внесены в `docs/frontend/temporary-deviations-log.md`.

## Блок C: CI и проверки

- [ ] `npm run check:workspace-prereqs` проходит или предсказуемо валит PR с понятной причиной.
- [ ] `npm run check:route-parity` проходит.
- [ ] `npm run check:dictionaries-page-size` проходит.
- [ ] `nx affected -t lint,test,build` запускается в CI без ручных project-списков.

## Блок D: Документация

- [ ] Обновлены `architecture-audit-master.md`/канон-доки при архитектурных изменениях.
- [ ] В PR есть явное описание остаточных рисков и границ применимости.

