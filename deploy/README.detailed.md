# Deploy — полная шпаргалка

Подробная инструкция: ZIP, rsync, первый запуск, логи, локальный Postgres и сброс БД.

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

---

# Deploy — шпаргалка

## 0) Обязательный pre-deploy gate

Перед любой выкладкой прогоняем критичный минимум тестов:

- `docs/release-gates.md`
- Stop/Go правило: `docs/release-gates.md` (раздел `5) Stop-list (деплой блокируется)`)

PowerShell-порядок:

```powershell
cd backend
npm run test:critical
cd ../crm-web
npm run test:critical
```

Если любой шаг падает — деплой не продолжаем.

Один запуск всем пакетом (migrate + critical + smoke):

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1
```

Режим по умолчанию (если миграции не менялись):

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate
```

Режим по умолчанию с отчётом-артефактом:

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"
```

Файл `release-gate-report.json` сохраняем к задаче/релизному комментарию как подтверждение прохождения pre-deploy gate.
Подсказка по флагам: `powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -Help`
и `bash deploy/scripts/run-release-gate.sh --help`.

Shortcut daily-прогона critical-only:

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -CriticalOnly
```

Linux/macOS shortcut:

```bash
bash deploy/scripts/run-release-gate.sh --critical-only
```

Опционально для рискованных изменений статусов/заказов: ручной стресс-прогон
`deploy/scripts/run-concurrency-probe.ps1|.sh` (команда и параметры — в `docs/release-gates.md`).
Подсказка по флагам probe: `powershell -ExecutionPolicy Bypass -File deploy/scripts/run-concurrency-probe.ps1 -Help`
и `bash deploy/scripts/run-concurrency-probe.sh --help`.

---

## Простыми словами: куда положить ZIP и что сделать на сервере

**Куда положить файл**  
Положите **`prebuilt-web.zip`** в **ту же папку, где лежит `deploy.sh`** — это каталог **`deploy`** внутри вашего клона репозитория на сервере.

- Если репозиторий у вас в **`/opt/crm`**, то путь к архиву должен быть: **`/opt/crm/deploy/prebuilt-web.zip`**.
- Имя файла важно: именно **`prebuilt-web.zip`**, не другое.
- Руками распаковывать архив **не нужно**.

**Достаточно ли одной команды деплоя**  
Да. После того как файл лежит в **`…/deploy/prebuilt-web.zip`**, зайдите в эту папку и выполните:

```bash
cd /opt/crm/deploy   # ваш путь к deploy, если другой — подставьте свой
./deploy.sh
```

Перед `./deploy.sh` проверьте, что есть свежий `release-gate-report.json` (полученный через `deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"`).
`deploy.sh` покажет `gateStatus` из отчёта и выведет предупреждение, если отчёт старше 24 часов.
Если статус не `passed` или отчёт устарел, скрипт выведет готовые команды пересоздания отчёта (PowerShell и Bash).
Подсказка по командам скрипта: `bash ./deploy.sh --help`.
`deploy.sh` принимает только `--help`/`-h`; любые другие аргументы считаются ошибкой.
Проверка возраста отчёта использует `python`, а при его отсутствии fallback через `stat`.
Если путь к отчёту нестандартный, можно задать `GATE_REPORT_PATH=<path-to-json>` перед запуском `deploy.sh`.
Важно: `GATE_REPORT_PATH` должен совпадать с путём, который использовался в `-ReportPath`/`--report-path` при создании gate-отчёта.
Если `GATE_REPORT_PATH` относительный, `deploy.sh` трактует его относительно корня репозитория.
Пример: `GATE_REPORT_PATH=./tmp/release-gate-nightly.json bash ./deploy.sh`.
PowerShell-эквивалент: `$env:GATE_REPORT_PATH="./tmp/release-gate-nightly.json"; bash ./deploy.sh`.
После запуска в той же PowerShell-сессии можно сбросить переменную: `Remove-Item Env:GATE_REPORT_PATH`.
В Bash-сессии сброс: `unset GATE_REPORT_PATH`.
При старте `deploy.sh` выводит источник пути отчёта: `default` или `GATE_REPORT_PATH=...`.
Это же правило продублировано в `bash ./deploy.sh --help`: относительный путь резолвится от корня репозитория.

Одна команда **`./deploy.sh`** сама: подтянет код с GitHub (если настроен git), при наличии zip — **распакует** его, **удалит** zip, соберёт/обновит контейнеры и поднимет сайт. Отдельно ничего архивировать на сервере не нужно — только залить **один** zip и запустить скрипт.

**Куда скрипт «скидывает» файлы из архива**  
Всё распаковывается в подпапку **`prebuilt-web`** рядом с `deploy.sh`, т.е. **`…/deploy/prebuilt-web/`** (там появятся `index.html`, `*.js` и т.д.). Контейнер **nginx** отдаёт сайт именно из этой папки. Сам **`prebuilt-web.zip` после успешной распаковки удаляется** — это нормально, при следующем обновлении фронта заливаете новый zip снова.

**На сервере один раз** должна быть утилита **`unzip`** (например `sudo apt install unzip`).

---

## Чеклист: обновление сайта на сервере (если менялся фронт или нужен актуальный UI)

**Важно:** **`git push` переносит только код из репозитория.** Каталог **`deploy/prebuilt-web/`** в git **не коммитится** — готовую статику нужно **каждый раз** обновлять на VPS **отдельно** от push (rsync / scp / SFTP / WinSCP).

| Шаг | Где | Что сделать |
|-----|-----|-------------|
| **1** | Локально | Закоммитить изменения и **`git push`** в GitHub (как обычно). |
| **2** | Локально | Запустить pre-deploy gate и сохранить `release-gate-report.json` (раздел `0`). |
| **3** | Локально | **Сразу пересобрать** прод-фронт (команды в блоке ниже) — чтобы артефакты соответствовали только что запушенному коду. |
| **4** | Локально → сервер | **Удобнее — один ZIP:** собрать архив (команды ниже), залить **`prebuilt-web.zip`** в каталог **`…/deploy/`** на сервере (рядом с `deploy.sh`). При **`./deploy.sh`** архив сам распакуется в `prebuilt-web/` и удалится. **Либо** по-прежнему залить **содержимое** `browser/` в **`…/deploy/prebuilt-web/`** без zip. |
| **5** | Сервер | **`./deploy.sh`** в каталоге `deploy/` — подтянет репо с GitHub, при наличии `prebuilt-web.zip` распакует его, соберёт образы, поднимет контейнеры. |

Если сделать только шаги **1** и **5**, backend/репо обновятся, но **интерфейс останется старым**, пока не выполнены **3** и **4**.

### Шаг 2 — команды локально

Из корня репозитория:

```bash
cd crm-web
node scripts/sync-canonical-roles.cjs
npx nx run crm-web:build:production
```

Артефакты появятся в **`crm-web/dist/crm-web/browser/`**.

#### Windows: репозиторий на UNC (`\\сервер\…`, Synology Drive)

Инструменты вроде **Nx** часто **не стартуют**, если текущий каталог — сетевой путь без буквы диска.

**Вариант 1 — подставить букву диска (из cmd или PowerShell):**

```powershell
subst T: \\ВАШ_СЕРВЕР\путь\crm
cd T:\crm-web
node scripts/sync-canonical-roles.cjs
npx nx run crm-web:build:production
cd ..
powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1
subst T: /d
```

**Вариант 2 — вывод сборки на локальный диск**, затем зеркально в **`deploy/prebuilt-web`** (если при сборке на сетевой папке падает удаление/создание каталогов, например `kp-media`):

```powershell
cd crm-web   # лучше тоже через subst или локальный клон
$out = "$env:LOCALAPPDATA\Temp\crm-web-nx-out"
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
npx nx run crm-web:build:production --outputPath=$out
robocopy "$out\browser" "..\deploy\prebuilt-web" /MIR
cd ..
powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1
```

Если **`pack-prebuilt-web.ps1`** требует именно **`crm-web\dist\crm-web\browser`**, после **`robocopy`** содержимое уже в **`deploy/prebuilt-web`** — можно собрать **`prebuilt-web.zip`** тем же способом, что внутри скрипта (архив с путями через **`/`**), либо временно скопировать **`browser`** в **`dist\crm-web\browser`** и запустить скрипт.

### Шаг 3 — рекомендуется: один ZIP

**Windows (PowerShell), из корня репо:**

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1
```

**Linux / macOS** (нужен пакет `zip`):

```bash
bash deploy/scripts/pack-prebuilt-web.sh
```

Получите **`deploy/prebuilt-web.zip`** (в git не коммитится). Залейте **один этот файл** на сервер в **`/opt/crm/deploy/prebuilt-web.zip`** (имя и путь важны). На сервере должен быть **`unzip`** (`apt install unzip`).

**Загрузка одного файла (пример):**

```powershell
scp D:\crm\deploy\prebuilt-web.zip user@server:/opt/crm/deploy/
```

Дальше на сервере по-прежнему **`./deploy.sh`**: скрипт распакует zip в `prebuilt-web/`, удалит архив, пропишет `crm-build` в `index.html`.

### Шаг 3 — альтернатива: папка без архива

Нужны **файлы внутри** `browser/` в **`…/deploy/prebuilt-web/`**.

**Linux / macOS:**

```bash
rsync -av --delete ./crm-web/dist/crm-web/browser/ user@server:/opt/crm/deploy/prebuilt-web/
```

**Windows (PowerShell):**

```powershell
scp -r D:\crm\crm-web\dist\crm-web\browser\* user@server:/opt/crm/deploy/prebuilt-web/
```

---

## Как устроен сервис `web`

Образ **`web`** — это **nginx без сборки Angular**. Статика читается с диска сервера: **`deploy/prebuilt-web/`**.

**На сервере** после заполнения `prebuilt-web/`:

```bash
cd /opt/crm/deploy
./deploy.sh
```

`deploy.sh` проверяет наличие **`prebuilt-web/index.html`**. Перед запуском контейнеров в этот файл на **диске сервера** дописывается meta **`crm-build`** с текущим SHA git.

Сборка SPA **внутри Docker** (CI или мощный хост): **`deploy/Dockerfile.web.in-docker-build`**. Тогда в **`docker-compose.yml`** у сервиса `web` укажите этот dockerfile и **уберите** `volumes` у `web` (том перекроет файлы из образа).

---

## Сервер: обновить и поднять стек

```bash
cd deploy
cp -n .env.example .env   # первый раз
# Должен быть заполнен deploy/prebuilt-web/ (см. чеклист в начале файла)
./deploy.sh
```

**База:** только `migrate deploy` + seed при старте backend. **Данные Postgres не сбрасываются.**

---

## Логи на сервере

```bash
cd deploy
docker compose --env-file .env logs -f backend
docker compose --env-file .env logs -f --tail=200 backend
```

Подробнее для разбора ошибок: `docs/dev-logs-and-diagnostics.md`.

---

## Локально: Postgres

Из корня репозитория:

```bash
docker compose -f docker-compose.yml --env-file deploy/.env up -d postgres
# или без deploy/.env:
docker compose -f docker-compose.yml up -d postgres
```

---

## Локально: полный сброс БД (всё стереть)

**Windows**

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/reset-local-dev-database.ps1
```

**Linux / macOS**

```bash
bash deploy/scripts/reset-local-dev-database.sh
```

Нужен `backend/.env` с `DATABASE_URL` на `127.0.0.1` или `localhost`.

---

## Чистая БД на сервере (редко)

Обычный деплой этого **не делает**. Нужно осознанно убрать volume Postgres и снова `./deploy.sh` — см. комментарии в `docker-compose.yml` и `docs/dev-logs-and-diagnostics.md`.

---

## Бэкап БД: `pg_dump` лезет на `localhost` вместо `postgres`

Сообщение `connection to server at "localhost" ... refused` значит, что для `pg_dump` взяли **fallback** на `DATABASE_URL` **без** хвоста `?…`, а там указан `localhost` (типично для `backend/.env` на вашем ПК).

- **Контейнер `backend` в Docker:** задайте `BACKUP_DATABASE_URL=postgresql://crm:ПАРОЛЬ@postgres:5432/crm` в **`deploy/.env`** (без кавычек вокруг URL), затем **`docker compose --env-file .env up -d --force-recreate backend`**. Обычного `restart` может не хватить, если переменная добавлена впервые.
- **`npm run dev` на машине разработчика:** `deploy/.env` процесс Node **не читает** — продублируйте `BACKUP_DATABASE_URL` в **`backend/.env`**, хост **`127.0.0.1`** или **`localhost`**, не `postgres`.
- После деплоя смотрите лог при первом бэкапе: строка `[db-backup] pg_dump/pg_restore: используется BACKUP_DATABASE_URL → postgres:5432` или `… DATABASE_URL (fallback) → …` — так видно, какой путь сработал.

---

## Synology NAS (DSM)

- **Путь к проекту** часто вида **`/volume1/docker/crm`**. Compose и команды выполняйте из **корня репозитория**:  
  `docker compose -f docker-compose.yml --env-file deploy/.env …`
- **Git** в SSH может отсутствовать — обновление кода с ПК через общую папку / Drive / `rsync` нормальная схема; **`deploy/.env`** на NAS не перезаписывайте.
- **`docker compose build`**: при ошибках **`mkdir /var/services/homes`** задайте **`export HOME=/volume1/docker/crm`** (или другой каталог на томе данных); при странном поведении BuildKit: **`export DOCKER_BUILDKIT=0`** и **`export COMPOSE_DOCKER_CLI_BUILD=0`**.
- **`permission denied`** на **`/var/run/docker.sock`** при членстве в группе **`docker`**: проверьте **`ls -l /var/run/docker.sock`**. Если группа **`root`**, а не **`docker`**:  
  `sudo chown root:docker /var/run/docker.sock` и **`sudo chmod 660 /var/run/docker.sock`**. После перезагрузки NAS права иногда сбрасываются — повторите или оформите задачу при загрузке.
- Предупреждение SSH **`Could not chdir to home directory …/homes/ПОЛЬЗОВАТЕЛЬ`**: включите **службу user home** в DSM или не обращайте внимание; на деплой не влияет.

---

## Ещё

Порты: `docs/dev-local-ports.md`. Backend: `backend/README.md`. Prisma + Cursor: `backend/README.md` (сброс БД).
