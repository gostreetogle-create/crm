# Deploy — шпаргалка

## Сервер: обновить и поднять стек

```bash
cd deploy
cp -n .env.example .env   # первый раз
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

## Ещё

Порты: `docs/dev-local-ports.md`. Backend: `backend/README.md`. Prisma + Cursor: `backend/README.md` (сброс БД).
