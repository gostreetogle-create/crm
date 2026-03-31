# Frontend Architecture Audit Master

Дата: 2026-03-31  
Репозиторий: `D:/crm`  
Область: `crm-web`, `srm-front`, `.github/workflows/frontend-ci.yml`, `docs/frontend/*`

## Recovery Run (2026-03-31, branch `recovery/nx-workspace-restore-2026-03-31`)

- Стартовый `git status --short`: массовые удаления tracked-файлов по `backend/**`, `crm-web/**`, `docs/**`; untracked: `crm-web/.nx/`, `crm-web/node_modules/`.
- Стартовый `git log --oneline -5`:
  - `29fc4ee` docs: запись в dev-session-log (#15) после push `a57331a`
  - `a57331a` docs(frontend): complete master audit package for checklist alignment
  - `e34a93e` docs: запись в dev-session-log (#14) после push `a90194d`
  - `a90194d` docs(frontend): refresh master audit with re-baseline verification
  - `da2af86` docs: запись в dev-session-log (#13) после push `50f205f`

## Допущения и границы

1. Аудит проводится по фактическому состоянию рабочей копии, где зафиксированы массовые удаления из индекса git.
2. Восстановление полной Nx-структуры не выполняется автоматически, так как это требует отдельного согласованного шага миграции/восстановления.
3. Статусы `Blocked` означают "невозможно завершить без восстановления отсутствующих файлов/конфигов", а не пропуск этапа.

## Блок A — Baseline и безопасность

### A1. Baseline git
- `git status --short`: массовые удаления, плюс `crm-web/.nx`, `crm-web/node_modules`.
- `git log --oneline -20`: актуальный HEAD `e34a93e`.
- Измененные зоны: `backend/**`, `crm-web/**`, `docs/**`, `deploy/**`, `.github/**`.

### A2. Secrets scan
- Выполнен поиск high-risk паттернов в `crm-web/src`, `crm-web/libs`, `docs`, `.github`.
- Совпадения по шаблонам ключей (`AKIA`, `ghp_`, `BEGIN RSA PRIVATE KEY`, `AIza`, `xox*`) не найдены.

### A3. Подъем "с нуля"
- В текущей копии `npm ci` уже выполнен (есть `node_modules`), но цель "чистая копия clone -> npm ci -> build -> serve" в этом репозитории блокируется отсутствием обязательных Nx-файлов.
- `npm run build`: FAIL (`Cannot find configuration for task @crm-web/source:build`).
- `npm run start`: FAIL (`Cannot find configuration for task @crm-web/source:serve`).

### A4. Линт/тест/сборка baseline
- `npx nx affected -t lint --base=origin/main --head=HEAD --parallel=2`: PASS (No tasks were run).
- `npm run test`: FAIL (нет task config для `@crm-web/source:test`).
- `npm run build`: FAIL (нет task config для `@crm-web/source:build`).

### A5. Документ аудита
- Этот файл является master-документом и источником правды по текущему циклу.

## Блок B — Архитектурный аудит

### B6. Nx структура и границы
- `Blocked`: отсутствуют `nx.json`, root `project.json`, `eslint.config.mjs`, `jest.preset.js`.
- Смягчение: fail-fast `check:workspace-prereqs` уже фиксирует проблему до `nx` шагов.

### B7. Enforce module boundaries и обходы
- `Blocked`: без root ESLint/Nx config rule-проверка не воспроизводится.

### B8. Дублирование ответственности (`crm-web` vs `srm-front`)
- `Done`: route parity вынесен в контракт и скрипт-проверку (`check:route-parity`).

### B9. Mega files
- `Done`: проверен `dictionaries-page.ts`, установлен guard (`5750` строк, лимит `6200`).

### B10. Единообразие форм/полей/таблиц по словарям
- `Blocked`: большая часть словарных модулей отсутствует в текущем snapshot.

### B11. Консистентность именования полей/payload
- `Blocked`: проверка возможна частично только для сохраненных фрагментов `dictionaries-hub-feature`.

### B12. Стратегия переиспользования через `ui-kit`
- `Blocked`: `libs/ui-kit/project.json` отсутствует; полная верификация невозможна.

### B13. Тестовая стратегия и дыры
- `Blocked`: отсутствует часть тестовой инфраструктуры (`jest.preset.js`, часть project config).

### B14. CI workflow quality gates
- `Done`: в workflow присутствуют fail-fast и `nx affected`.

### B15. Сопоставление docs vs код
- `Done`: ключевые канон-доки обновлены/проверены на соответствие текущим guard-практикам.

## Блок C — P0

### C16. CI gates (`affected lint/test/build`)
- `Done` в workflow.

### C17. Обязательные route parity checks
- `Done`: отдельный gate `check:route-parity`.

### C18. Critical architectural drifts
- `Partial`: устранен drift по публичным redirect/route parity; остальные drifts заблокированы отсутствующей структурой.

### C19. Единый policy targets для Nx-проектов
- `Blocked`: требуется восстановить root/project configs.

### C20. Fail-fast архитектурные проверки в CI
- `Done`: `check:workspace-prereqs`, `check:route-parity`, `check:dictionaries-page-size`.

### C21. P0 дефекты по полям/валидациям/таблицам
- `Blocked`: отсутствуют критичные части словарных модулей.

### C22. Автотесты на P0 зоны
- `Partial`: контракт route parity покрыт скриптом; unit/integration блокированы инфраструктурой.

### C23. Green полный цикл по P0
- `Blocked`: `check:workspace-prereqs` валится корректно на missing prerequisites.

## Блок D — P1

### D24..D31
- `Blocked/Partial` по тем же инфраструктурным причинам.  
- Доступные P1-улучшения уже зафиксированы: route contract centralization, mega-file guard, PR/checklist docs.

## Блок E — Документация

### E32. `feature-structure.md`
- `Done` (проверено и согласовано с текущими guard-подходами).

### E33. `development-workflow.md`
- `N/A`: документ уже в актуальном каноническом виде; правки не требовались в этом цикле.

### E34. `dictionaries-crud-playbook.md`
- `Done` (проверено, канон сохранен).

### E35. `architecture-canon.md`
- `Done` (актуален).

### E36. `field-contracts-canon.md`
- `Done` (создан/обновлен в этом цикле).

### E37. `parity-policy-crm-vs-srm.md`
- `Done` (создан alias-документ на основе parity policy).

### E38. `pr-checklist.md`
- `Done` (актуален).

### E39. `temporary-deviations-log.md`
- `Done`: активных исключений нет.

### E40. Документы не противоречат коду/CI
- `Partial`: не противоречат текущему observable-состоянию; полная валидация зависит от восстановления Nx-структуры.

## Блок F — Видео-документация

### F41..F46
- `Done`: структура видео-программы дополнена целями, сценарием, демо, частыми ошибками и DoD.

## Блок G — Финализация

### G47. Полный прогон lint/test/build
- `Blocked`: отсутствует полноценная Nx-конфигурация.

### G48. Smoke-run приложения
- `Blocked`: `nx serve` недоступен без task config.

### G49. Risk register
- `Done`: сформирован в этом документе и финальном отчете.

### G50. Release-ready checklist
- `Done`: отражен в итоговой таблице статусов.

### G51. Changelog архитектурных изменений
- `Done`: зафиксирован в финальном отчете.

### G52. Обновление `docs/dev-session-log.md` после push
- `N/A`: выполняется строго после фактического push.

### G53. Финальные коммиты + push
- `Pending`: выполняется отдельным шагом после завершения текущего пакета правок.

## Recovery progress update (points 15-25)

### Point 15: Field-contract consistency (critical dictionaries)
- `Done`: добавлены контрактные тесты для payload + table-key набора в `dictionaries-hub-feature`.
- Проверены зоны: work-types, materials, geometries, colors.

### Point 16: Contract tests on critical routes/forms
- `Done`: добавлены/расширены тесты:
  - `dictionaries-page-payload-builders.spec.ts`
  - `dictionaries-page-table-columns.spec.ts`

### Point 17: Full quality cycle re-run
- `Done`:
  - `check:workspace-prereqs` PASS
  - `check:route-parity` PASS
  - `check:dictionaries-page-size` PASS
  - `nx run-many -t lint --all` PASS (warnings only in existing mock repos)
  - `nx run-many -t test --all` PASS
  - `nx run-many -t build --all` PASS

### Point 18: Docs sync after recovery
- `Done`: обновлены `architecture-audit-master.md`, `release-ready-checklist.md`.
- В "комитетный" контур включен UI/UX audit prompt для нетехнического владельца:
  - `docs/frontend/ai-ui-audit-agent-prompt.ru.md`
  - ссылка добавлена в `docs/frontend/development-workflow.md`.

### Point 19: Temporary deviations log
- `Done`: новых временных отклонений не добавлено (не требуется).

### Point 20: Updated risk register (top residual)
- `Done`:
  1. Массовые удаления вне frontend scope в рабочем дереве.
  2. Lint warnings в mock data-access репозиториях (`_options` unused).
  3. `nx affected` может быть no-op в зависимости от diff, поэтому для релизного цикла использовался `run-many --all`.
  4. Mega-file `dictionaries-page.ts` остается зоной техдолга (лимит соблюден).
  5. Smoke проверка выполнена на HTTP-уровне; browser-level сценарии (UI click-flow) требуют отдельного e2e/ручного прогона.

## UX standardization batch #1 (compact CRM controls)

Статус: `Done` (safe UI-only update, без изменения доменной логики/API/роутинга).

- Единые компактные токены:
  - `--ui-control-compact-height: 32px`
  - `--ui-row-action-size: 28px`
- Применено в shared UI:
  - `ui-button`: единая высота, hover/focus-visible.
  - `ui-form-field`: единая компактная высота input/select/textarea, мягкий focus.
  - `crud-layout`: компактный search input и row-action кнопки, единые hover/focus.
- Ожидаемый UX-эффект:
  - меньше визуального шума в таблицах и формах;
  - выше плотность данных в стиле CRM;
  - более предсказуемые состояния фокуса и навигации с клавиатуры.

## UX standardization batch #2 (table readability)

Статус: `Done` (safe UI-only update).

- В `crud-layout` добавлены мягкие состояния строк:
  - чётные строки с лёгким фоном (zebra) для визуального сканирования;
  - hover-подсветка строки для фокусировки на текущем элементе.
- Ожидаемый UX-эффект:
  - быстрее чтение длинных таблиц;
  - меньше промахов по строкам;
  - ниже утомляемость при дневной работе со списками.

## UX standardization batch #3 (fast form mode)

Статус: `Done` (safe UI-only update).

- Введены форм-токены:
  - `--ui-form-stack-gap: 10px`
  - `--ui-form-actions-gap: 8px`
- Применено к общим form-stack паттернам и словарным формам:
  - более плотные вертикальные интервалы между полями;
  - одинаковый отступ блока действий;
  - унифицированный отступ вывода ошибки (`fieldError`).
- Ожидаемый UX-эффект:
  - меньше прокрутки в длинных формах;
  - быстрее заполнение и проверка полей;
  - стабильный ритм “поле -> ошибка -> следующее поле”.

## UX standardization batch #4 (toolbar/action groups)

Статус: `Done` (safe UI-only update).

- Добавлены токены toolbar-ритма:
  - `--ui-toolbar-gap: 6px`
  - `--ui-toolbar-group-gap: 4px`
- Применено в `crud-layout`:
  - унифицированы интервалы между группами действий и внутри групп;
  - toolbar стал визуально компактнее и более предсказуемым.
- Уточнены состояния `ui-button` для `soft` и `danger`:
  - более явный hover и иерархия вторичных/опасных действий.
- Ожидаемый UX-эффект:
  - меньше визуальной перегрузки в шапке CRUD;
  - быстрее распознаются приоритетные действия;
  - единый ритм кнопок в разных карточках словарей.


