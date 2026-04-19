# Release Gates (критичный минимум)

Короткий чеклист перед релизом/деплоем, чтобы не пропустить критичные регрессии.

По умолчанию команды ниже запускаются из **корня репозитория** (если не указано иное).

**Спринт до сдачи (~6 дней):** чеклисты MVP, ручной smoke и вечерний прогон `doctor` + `build` + `test:critical` (оба пакета) — [dev-sprint-6d-runbook.md](./dev-sprint-6d-runbook.md); скрипты `deploy/scripts/run-daily-gates.ps1` и `deploy/scripts/run-daily-gates.sh` (`-Help` / `--help`).

## Быстрый self-check

Перед прогоном gate можно быстро проверить, что скрипты доступны и флаги читаются:

```bash
bash deploy/deploy.sh --self-check
bash deploy/scripts/run-release-gate.sh --help
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -Help
bash deploy/scripts/run-concurrency-probe.sh --help
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-concurrency-probe.ps1 -Help
```

Как трактовать результат `bash deploy/deploy.sh --self-check`:
- `Self-check finished.` без warning — окружение готово.
- `Self-check completed with warnings (...)` — чаще всего mixed shell/line endings; не блокирует деплой, но желательно свериться с `--help` вручную для проблемных скриптов.
- В начале self-check выводится окружение (`bash`, `powershell`, `npm`) для быстрой диагностики.

Что проверить при warning:
- Убедитесь, что `bash` доступен в `PATH` и запускается: `bash --version`.
- Для `*.sh` проверьте LF-окончания (не CRLF) в изменённых скриптах.
- Для PowerShell-скриптов проверьте запуск help напрямую:
  `powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -Help`.

## Минимальный операторский сценарий (3 команды)

Если нужен самый простой и безопасный маршрут перед выкладкой:

```powershell
# 1) Прогоняем gate и сохраняем артефакт
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"

# 2) Собираем frontend-архив
powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1

# 3) На сервере запускаем деплой
cd /путь/к/репо/deploy
bash ./deploy.sh
```

Если шаг 1 красный — шаги 2-3 не выполняем.
Подсказка по деплой-скрипту: `bash ./deploy.sh --help` (кроме `--help/-h` другие аргументы не принимаются).
`deploy.sh` можно запускать как из корня (`bash deploy/deploy.sh`), так и из каталога `deploy/` (`bash ./deploy.sh`).
Быстрая проверка скриптов: `bash ./deploy.sh --self-check` (non-blocking, в mixed shell env возможны warning).
PowerShell-эквивалент: `bash ./deploy/deploy.sh --self-check`.
Примечание: отчёты `release-gate-report*.json` и `probe-report*.json` добавлены в `.gitignore` (не попадут в коммит случайно).
Если используете кастомный путь отчёта, задайте одинаковый путь в gate-команде и в `GATE_REPORT_PATH` (см. `deploy/.env.example`).
При старте `deploy.sh` выводит источник пути отчёта: `default` или `GATE_REPORT_PATH=...`.

Пример с кастомным путём отчёта:

```bash
# локально: формируем gate-отчёт в нестандартный путь
bash deploy/scripts/run-release-gate.sh --skip-migrate --report-path "./tmp/release-gate-nightly.json"

# на сервере: указываем тот же путь для deploy.sh
export GATE_REPORT_PATH="./tmp/release-gate-nightly.json"
bash ./deploy.sh
```

Linux/macOS минимальный сценарий:

```bash
# 1) Прогоняем gate и сохраняем артефакт
bash deploy/scripts/run-release-gate.sh --skip-migrate --report-path "./release-gate-report.json"

# 2) Собираем frontend-архив
bash deploy/scripts/pack-prebuilt-web.sh

# 3) На сервере запускаем деплой
cd /путь/к/репо/deploy
bash ./deploy.sh
```

## 1) Backend critical

```powershell
cd backend
npm run test:critical
```

Что проверяется:

- бизнес-логика статусов КП;
- создание заказа из оплаченного КП;
- HTTP-контракт `commercial-offers` (status/delete);
- HTTP-контракт `orders`.

## 2) Frontend state critical

```powershell
cd crm-web
npm run test:critical
```

Что проверяется:

- правила статусов КП (`commercial-offer-status.rules`);
- маппинг ошибок `commercial-offers`;
- маппинг ошибок `orders`.

## 3) One-shot команда (PowerShell)

```powershell
cd backend
npm run test:critical
cd ../crm-web
npm run test:critical
```

## 3.1) Pipeline-скрипт (migrate + critical + smoke)

PowerShell (Windows):

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1
```

PowerShell с отчётом:

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -ReportPath "./release-gate-report.json"
```

PowerShell default (если миграции не менялись):

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate
```

Bash (Linux/macOS):

```bash
bash deploy/scripts/run-release-gate.sh
```

Bash с отчётом:

```bash
bash deploy/scripts/run-release-gate.sh --report-path "./release-gate-report.json"
```

Флаги для ускоренного локального прогона:

- PowerShell: `-SkipMigrate`, `-SkipSmoke`
- Bash: `--skip-migrate`, `--skip-smoke`
- Dry-run (проверка шагов без выполнения): PowerShell `-DryRun`, Bash `--dry-run`
- Critical-only shortcut (эквивалент skip migrate + skip smoke): PowerShell `-CriticalOnly`, Bash `--critical-only`
- Отчёт в JSON: PowerShell `-ReportPath <file>`, Bash `--report-path <file>`
- Справка по флагам: PowerShell `-Help`, Bash `--help` (или `-h`)

PowerShell daily default:

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -CriticalOnly
```

Bash daily default:

```bash
bash deploy/scripts/run-release-gate.sh --critical-only
```

Preflight:

- Скрипт ожидает `npm` в `PATH` и завершится сразу с понятной ошибкой, если Node.js/npm не установлены.
- Скрипт проверяет наличие `backend/node_modules` и `crm-web/node_modules`; если папок нет, сначала выполнить `npm install` в соответствующем каталоге.

Если `e2e:smoke` падает на отсутствии браузера Playwright, установите:

```powershell
cd crm-web
npx playwright install chromium
```

## 4) Когда `critical`, а когда `full`

| Ситуация | Что запускать |
|---|---|
| Перед обычным деплоем/горячим фиксом | `backend: npm run test:critical` + `crm-web: npm run test:critical` |
| Меняли только документацию/комментарии | Тесты можно не запускать, если код не трогали |
| Меняли ядро БЛ (статусы/заказы/API-контракты) | Сначала `critical`, затем полный прогон: `backend: npm test`, `crm-web: npm test` |
| Перед релизом с крупной серией изменений | Полный прогон обязателен: `backend: npm test`, `crm-web: npm test` |
| После обновления зависимостей/infra-конфига тестов | Полный прогон обязателен + проверка, что `critical` также зеленый |

## 5) Stop-list (деплой блокируется)

Деплой **не выполняем**, если есть хотя бы один пункт:

- Любой `test:critical` завершился с ошибкой.
- Полный прогон (`npm test`) обязателен по таблице выше, но не запускался.
- Изменена логика статусов/заказов/API-ошибок, но тесты в этом контуре не обновлены.
- Есть новые lint/type ошибки в измененных файлах.
- Документация процесса расходится с кодом (например, команды в docs устарели).

## Критерий прохождения

- Все команды выше завершаются без ошибок.
- Если изменялась логика статусов/заказов/ошибок, соответствующие тесты обновлены в том же PR.

## Что уже покрыто (snapshot)

- `commercial-offers`: статусные переходы, legacy-нормализация, создание заказа из paid, HTTP-контракт status/delete.
- `orders`: HTTP-контракт `GET/POST/PUT/DELETE`, включая `invalid_body`, `invalid_offer_ref`, `order_exists_for_offer`, `not_found`.
- `dictionaries-state` (frontend): правила переходов/нормализация статусов КП + маппинг ошибок `commercial-offers` и `orders`.
- e2e smoke (Playwright): UI-поток `черновик -> на согласовании -> оплачено` с проверкой появления заказа в хабе.
- Race-safe идемпотентность создания заказа: `P2002` при конкурентном create обрабатывается как успешный no-op.
- Псевдо-конкурентный backend test: два параллельных перехода в `proposal_paid` не приводят к падению сценария.
- Исполняемый release-gate pipeline: `deploy/scripts/run-release-gate.ps1|.sh` (migrate + critical + smoke).
- Ручной concurrency probe: `deploy/scripts/run-concurrency-probe.ps1|.sh` для стресс-проверки `/:id/status` на живом backend.

## Что еще не покрыто (остаточный риск)

- Нагрузочный/долгий сценарий параллельных смен статусов (конкурентные действия нескольких пользователей, high-load профиль с реальной БД/транзакциями) не входит в обязательный gate и выполняется вручную probe-скриптом.

### Ручной запуск concurrency probe (опционально)

Подсказка по флагам:
- PowerShell: `powershell -ExecutionPolicy Bypass -File deploy/scripts/run-concurrency-probe.ps1 -Help`
- Bash: `bash deploy/scripts/run-concurrency-probe.sh --help`

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-concurrency-probe.ps1 `
  -OfferId "<offer-id>" `
  -AuthToken "<jwt>" `
  -BaseApiUrl "http://127.0.0.1:3000/api" `
  -TargetStatus proposal_paid `
  -Requests 50 `
  -TimeoutSec 15 `
  -Concurrency 10 `
  -ReportPath "./probe-report.json" `
  -Strict
```

Linux/macOS:

```bash
bash deploy/scripts/run-concurrency-probe.sh \
  --offer-id "<offer-id>" \
  --auth-token "<jwt>" \
  --base-api-url "http://127.0.0.1:3000/api" \
  --target-status proposal_paid \
  --requests 50 \
  --timeout-sec 15 \
  --concurrency 10 \
  --report-path "./probe-report.json" \
  --strict
```

### Как интерпретировать результат probe

- `2xx` доминирует, `5xx = 0` — сценарий считается устойчивым.
- `409` допустим в конкурентном контуре (конфликт перехода/состояния), если нет роста `5xx`.
- Любой `5xx` в strict-прогоне — это красный флаг: разбираем логи по `requestId` и не считаем релиз безопасным.
- Отчёт `probe-report.json` сохраняем как артефакт проверки (к задаче/релизному комментарию).
