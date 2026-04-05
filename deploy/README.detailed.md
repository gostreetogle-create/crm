# Deploy — полная шпаргалка

Подробная инструкция: ZIP, rsync, первый запуск, логи, локальный Postgres и сброс БД.

---

# Deploy — шпаргалка

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
| **2** | Локально | **Сразу пересобрать** прод-фронт (команды в блоке ниже) — чтобы артефакты соответствовали только что запушенному коду. |
| **3** | Локально → сервер | **Удобнее — один ZIP:** собрать архив (команды ниже), залить **`prebuilt-web.zip`** в каталог **`…/deploy/`** на сервере (рядом с `deploy.sh`). При **`./deploy.sh`** архив сам распакуется в `prebuilt-web/` и удалится. **Либо** по-прежнему залить **содержимое** `browser/` в **`…/deploy/prebuilt-web/`** без zip. |
| **4** | Сервер | **`./deploy.sh`** в каталоге `deploy/` — подтянет репо с GitHub, при наличии `prebuilt-web.zip` распакует его, соберёт образы, поднимет контейнеры. |

Если сделать только шаги **1** и **4**, backend/репо обновятся, но **интерфейс останется старым**, пока не выполнены **2** и **3**.

### Шаг 2 — команды локально

Из корня репозитория:

```bash
cd crm-web
node scripts/sync-canonical-roles.cjs
npx nx run crm-web:build:production
```

Артефакты появятся в **`crm-web/dist/crm-web/browser/`**.

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
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d postgres
# или без deploy/.env:
docker compose -f deploy/docker-compose.yml up -d postgres
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

## Ещё

Порты: `docs/dev-local-ports.md`. Backend: `backend/README.md`. Prisma + Cursor: `backend/README.md` (сброс БД).
