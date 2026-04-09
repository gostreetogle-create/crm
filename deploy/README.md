# Деплой CRM — краткая инструкция

## Быстрый путь (3 шага)

1. Прогоните gate с артефактом:  
   `powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"`
   (Linux/macOS: `bash deploy/scripts/run-release-gate.sh --skip-migrate --report-path "./release-gate-report.json"`)
2. Соберите фронт-архив:  
   `powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1`
3. На сервере выполните `bash ./deploy.sh` из каталога `deploy/`.

Детали и stop/go-правила: `docs/release-gates.md`.

## Быстрый self-check

Перед запуском можно быстро проверить, что скрипты доступны и флаги читаются:

```bash
bash ./deploy.sh --self-check
bash ./deploy.sh --help
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -Help
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-concurrency-probe.ps1 -Help
bash deploy/scripts/run-release-gate.sh --help
bash deploy/scripts/run-concurrency-probe.sh --help
```

`--self-check` у `deploy.sh` non-blocking: в смешанной shell-среде может завершиться с предупреждениями.
PowerShell-эквивалент запуска: `bash ./deploy/deploy.sh --self-check`.
Интерпретация:
- `Self-check finished.` без warning — всё ок.
- `Self-check completed with warnings (...)` — не блокирует деплой, но проблемные скрипты лучше проверить вручную через `--help`.
- В начале self-check печатаются версии/доступность `bash`, `powershell`, `npm`.
Что проверить при warning: `bash --version`, LF-окончания у `*.sh`, прямой запуск help у PowerShell-скриптов.

## Где что лежит

| Путь | Назначение |
|------|------------|
| **`docker-compose.yml`** (корень репозитория) | Описание сервисов Postgres / backend / web |
| **`deploy/deploy.sh`** | Скрипт деплоя (из каталога `deploy/`) |
| **`deploy/.env`** | Секреты и порты (в git не коммитится, шаблон — `.env.example`) |
| **`deploy/prebuilt-web/`** | Статика SPA для nginx (в git не коммитится) |
| **`deploy/prebuilt-web.zip`** | Один архив со статикой для заливки на сервер (в git не коммитится) |

Контейнер **web** монтирует **`./deploy/prebuilt-web`** относительно **корня репозитория** (см. `docker-compose.yml`).

---

## 0. Обязательный pre-deploy gate

Перед сборкой/выкладкой обязательно прогоните критичный минимум тестов по инструкции:

- `docs/release-gates.md`
- Stop/Go правило: `docs/release-gates.md` (раздел `5) Stop-list (деплой блокируется)`)

Быстрый порядок (PowerShell):

```powershell
cd backend
npm run test:critical
cd ../crm-web
npm run test:critical
```

Если любой шаг красный — деплой не продолжаем, сначала исправляем.

Один запуск всем пакетом (migrate + critical + smoke):

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1
```

Режим по умолчанию (когда не трогали миграции БД):

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate
```

Режим по умолчанию с сохранением артефакта проверки:

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"
```

`release-gate-report.json` прикладываем к задаче/релизному комментарию как формальное подтверждение прохождения gate.
Подсказка по флагам: `powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -Help`
и `bash deploy/scripts/run-release-gate.sh --help`.

Ещё проще (shortcut для daily-прогона critical-only):

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -CriticalOnly
```

Linux/macOS daily shortcut:

```bash
bash deploy/scripts/run-release-gate.sh --critical-only
```

Опционально для рискованных изменений статусов/заказов: ручной стресс-прогон
`deploy/scripts/run-concurrency-probe.ps1|.sh` (см. `docs/release-gates.md`).
Подсказка по флагам probe: `powershell -ExecutionPolicy Bypass -File deploy/scripts/run-concurrency-probe.ps1 -Help`
и `bash deploy/scripts/run-concurrency-probe.sh --help`.

---

## 1. Собрать фронт на ПК

Из **корня репозитория**:

```powershell
cd crm-web
node scripts/sync-canonical-roles.cjs
npx nx run crm-web:build:production
cd ..
powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1
```

Появится **`deploy/prebuilt-web.zip`** и (после успешного pack) содержимое должно совпадать с **`crm-web/dist/crm-web/browser/`**.

### Репозиторий на сетевом диске (`\\сервер\…`, Synology Drive)

**Nx не запускается**, если текущий каталог — UNC. Варианты:

1. **Буква диска:**  
   `subst T: \\сервер\путь\crm` → работать из `T:\crm-web` (см. подробности в `README.detailed.md`).

2. **Сборка на локальный диск**, затем копирование в `deploy/prebuilt-web`:

   ```powershell
   npx nx run crm-web:build:production --outputPath=C:\Users\ВАШ_ПОЛЬЗОВАТЕЛЬ\AppData\Local\Temp\crm-web-nx-out
   robocopy C:\Users\ВАШ_ПОЛЬЗОВАТЕЛЬ\AppData\Local\Temp\crm-web-nx-out\browser deploy\prebuilt-web /MIR
   powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1
   ```

Если `pack-prebuilt-web.ps1` ругается на отсутствие `dist\crm-web\browser`, после `robocopy` архив можно собрать вручную из **`deploy/prebuilt-web`** (см. скрипт — те же пути в zip через `/`).

---

## 2. Залить на сервер и поднять

Перед запуском `deploy.sh` убедитесь, что рядом с репозиторием есть свежий отчёт gate:
`release-gate-report.json` (команда генерации — в разделе `0. Обязательный pre-deploy gate`).
`deploy.sh` дополнительно покажет `gateStatus` из отчёта и предупредит, если отчёт старше 24 часов.
Если статус не `passed` или отчёт устарел, `deploy.sh` сразу выведет готовые команды пересоздания отчёта (PowerShell и Bash).
Проверка возраста отчёта работает с `python` или через fallback `stat` (если Python на сервере не установлен).
При нестандартном пути используйте переменную окружения `GATE_REPORT_PATH` перед запуском `deploy.sh`.
Важно: значение `GATE_REPORT_PATH` должно совпадать с путём из `-ReportPath`/`--report-path`, которым вы создали отчёт gate.
Если `GATE_REPORT_PATH` задан как относительный, `deploy.sh` трактует его относительно корня репозитория.
Пример: `GATE_REPORT_PATH=./tmp/release-gate-nightly.json bash ./deploy.sh`.
PowerShell-эквивалент: `$env:GATE_REPORT_PATH="./tmp/release-gate-nightly.json"; bash ./deploy.sh`.
После запуска в той же PowerShell-сессии можно сбросить переменную: `Remove-Item Env:GATE_REPORT_PATH`.
В Bash-сессии сброс: `unset GATE_REPORT_PATH`.
При старте `deploy.sh` пишет источник пути отчёта: `default` или `GATE_REPORT_PATH=...`.
То же правило видно в `bash ./deploy.sh --help`: относительный путь резолвится от корня репозитория.

**Вариант A — ZIP:** положите **`prebuilt-web.zip`** в **`…/deploy/`** рядом с **`deploy.sh`**, затем:

```bash
cd /путь/к/репо/deploy
bash ./deploy.sh
```

Подсказка по командам скрипта: `bash ./deploy.sh --help`
`deploy.sh` принимает только `--help`/`-h`; любые другие аргументы считаются ошибкой.

**Вариант B — только папка:** синхронизируйте содержимое **`deploy/prebuilt-web/`** на сервер, затем из **корня репо**:

```bash
export HOME=/путь/к/репо
cd /путь/к/репо
docker compose -f docker-compose.yml --env-file deploy/.env up -d --force-recreate web
```

Подставьте свой путь (например **`/volume1/docker/crm`** на Synology).

---

## 3. Synology (коротко)

- **Git** на NAS не обязателен: обновляйте код с ПК (сеть / Drive) и пересобирайте контейнеры.
- Перед **`docker compose build`** при ошибках вроде `mkdir /var/services/homes`:  
  `export HOME=/volume1/docker/crm` и при необходимости `export DOCKER_BUILDKIT=0`.
- Если **`permission denied`** к **`/var/run/docker.sock`** при том, что пользователь в группе **`docker`**:  
  `sudo chown root:docker /var/run/docker.sock` и `sudo chmod 660 /var/run/docker.sock` (после перезагрузки может сброситься).
- **`CORS_ORIGIN`** в **`deploy/.env`** должен совпадать с URL в браузере (не только `localhost`, если заходите по IP или через туннель).

Подробнее: **`deploy/README.detailed.md`**.
