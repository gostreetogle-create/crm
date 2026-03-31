# Frontend Architecture Audit Master

Дата аудита: 2026-03-31
Область: `crm-web`, `crm-web/srm-front`, `.github/workflows/frontend-ci.yml`, `docs/frontend/*`

## 1) Baseline

### 1.1 Git baseline
- `git status --short`: массовые удаления по репозиторию (backend + часть frontend/docs), рабочее дерево не является clean baseline.
- `git log --oneline -20`: актуальный HEAD `da2af86` (после внедрения P0/P1 и записи в dev-session-log).

### 1.2 Runtime baseline (до фиксов)
- `npm ci` в `crm-web`: PASS.
- `npx nx lint srm-front`: FAIL (`Cannot find project 'srm-front'`).
- `npx nx test srm-front`: FAIL (`Cannot find project 'srm-front'`).
- `npx nx build srm-front --configuration=production`: FAIL (`Cannot find project 'srm-front'`).
- `npx nx lint dictionaries-hub-feature`: FAIL (`No ESLint configuration found`).
- `npx nx test dictionaries-hub-feature`: FAIL (`jest.preset.js not found`).
- `npm run check:dictionaries-page-size`: PASS (`5750 <= 6200`).

### 1.3 Baseline risks
- P0: CI команды не воспроизводимы в текущем workspace (отсутствуют критичные Nx-конфиги).
- P0: отсутствует fail-fast gate на целостность workspace перед `nx` шагами.
- P0: route parity между `crm-web` и `srm-front` по legacy redirects не была зафиксирована единым контрактом.
- P1: mega-file риск: `dictionaries-page.ts` ~5750 строк, высокий порог когнитивной сложности.

## 2) Аудит (что проверено)

### 2.1 Nx boundaries
- Полноценная проверка `@nx/enforce-module-boundaries`: N/A в текущем срезе (нет `nx.json` и root ESLint config).
- Смягчающая мера: добавлен fail-fast скрипт prereqs (см. P0).

### 2.2 CI gates
- Workflow `frontend-ci.yml` обновлен на fail-fast проверки и `nx affected` шаги вместо жестко зашитого run-many по несуществующим проектам.
- Добавлен явный precondition gate для отсутствующих config-файлов.

### 2.3 Route parity (`crm-web` / `srm-front`)
- Проверены оба `app.routes.ts`.
- Выявлен дрейф: в `srm-front` не было legacy redirects `materials`/`geometries`.
- Исправлено через единый shared contract + тесты/скрипт.

### 2.4 Consistency полей/форм/таблиц
- Глубокий функциональный аудит всех CRUD-форм: N/A (в workspace отсутствует значимая часть feature/libs и app config).
- Локально проверен контракт роутинга и guard на размер mega-file.

### 2.5 Mega-file risks
- `dictionaries-page.ts` сохраняет высокий риск изменений "в одном месте всё сразу".
- Защитный gate по размеру уже есть и сохранен в CI.

## 3) P0 fixes (выполнено)

1. Fail-fast workspace gate:
   - `crm-web/scripts/check-workspace-prereqs.cjs`
   - `package.json` script `check:workspace-prereqs`
   - `frontend-ci.yml` step `Fail-fast workspace prerequisites`

2. Fail-fast route parity gate:
   - `crm-web/scripts/check-route-parity.cjs`
   - `package.json` script `check:route-parity`
   - `frontend-ci.yml` step `Fail-fast route parity contract`

3. CI execution model:
   - `frontend-ci.yml`: переход на `npx nx affected -t lint|test|build ...`
   - цель: не запускать "мертвые" таргеты и уменьшить шум.

4. Критичный дефект route parity:
   - добавлен shared список redirect-сегментов и подключен в оба route-файла.
   - добавлены контрактные тесты на redirects в оба `app.routes.dictionaries.contract.spec.ts`.

## 4) P1 refactor (выполнено)

- Унифицирован публичный route-contract:
  - `DICTIONARIES_PUBLIC_REDIRECT_SEGMENTS` вынесен в `@srm/dictionaries-hub-feature`.
  - `crm-web` и `srm-front` теперь строят legacy redirects из одного источника.
- Результат: снижен риск дрейфа, уменьшено ручное дублирование route-кода.

## 5) Что осталось (residual risk)

- Ключевой риск: workspace неполный (отсутствуют `nx.json`, root `project.json`, `eslint.config.mjs`, `jest.preset.js`, часть project configs), поэтому CI падает корректно и рано, но не проходит до зеленого статуса.
- Mega-file `dictionaries-page.ts` остается крупным; нужен этапный распил по доменным блокам.
- Полный аудит consistency полей/таблиц across all dictionaries в текущем snapshot невозможен без восстановления полной структуры проекта.

## 6) Статус по шагам задачи

- baseline: DONE
- аудит: DONE
- P0 fixes: DONE (в пределах доступного workspace)
- P1 refactor: DONE (route-contract refactor)
- docs rewrite: PARTIAL (см. `development-workflow` ограничение)
- video-docs plan: DONE

## 7) Цикл-проверка после внедрения (re-baseline)

### 7.1 Проверки
- `npm run check:workspace-prereqs`: FAIL-FAST (ожидаемо) с явным списком отсутствующих обязательных Nx-файлов.
- `npm run check:route-parity`: PASS.
- `npm run check:dictionaries-page-size`: PASS (`5750 <= 6200`).

### 7.2 Что подтверждено
- CI не скрывает архитектурные проблемы и падает рано с объяснимой причиной.
- Route parity `crm-web` / `srm-front` удерживается контрактом и fail-fast проверкой.
- Mega-file риск формально контролируется guard-скриптом.

### 7.3 N/A по шагам
- Полный `nx affected -t lint,test,build` в текущем workspace: N/A (невозможен без восстановления `nx.json`/root project configs).
- Перепись `docs/frontend/development-workflow.md`: N/A (файл относится к каноническим process-docs под hard-guard и требует отдельного согласования перед изменением).

