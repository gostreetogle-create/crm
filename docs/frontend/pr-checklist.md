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

---

## Команды автопрогона (блок C, как в CI)

Из каталога `crm-web/` (порядок как в `.github/workflows/frontend-ci.yml`):

```bash
npm run check:canonical-roles-sync
npm run check:workspace-prereqs
npm run check:route-parity
npm run check:dictionaries-page-size
npx nx affected -t lint --base=origin/main --head=HEAD --parallel=2
npx nx affected -t test --base=origin/main --head=HEAD --parallel=2
npx nx affected -t build --base=origin/main --head=HEAD --parallel=2
```

`check:canonical-roles-sync` при необходимости перезаписывает `canonical-roles.generated.ts` — если файл изменился, закоммитьте его вместе с правками `backend/shared/canonical-roles.seed.json`.

