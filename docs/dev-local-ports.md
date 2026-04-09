# Порты локальной разработки и Docker (канон)

Один согласованный набор портов для репозитория. Если порт занят — **освободите его** (остановите другой сервис или контейнер) и снова поднимите стек. Так не приходится править URL в нескольких местах.

| Что | Порт на ПК | Где настраивается |
|-----|------------|-------------------|
| PostgreSQL (`crm_postgres`) | **5432** | `deploy/.env` → `POSTGRES_PORT` (в `docker-compose` по умолчанию тоже 5432) |
| Backend API (`npm run dev` в `backend/`) | **3000** | порт по умолчанию в коде |
| Backend в полном Docker-стеке | **3000** | `deploy/.env` → `BACKEND_PORT` |
| Веб (nginx + статика, `crm_web`) | **8080** | `deploy/.env` → `WEB_PORT` |
| Angular dev (`nx serve` в `crm-web/`) | **4200** | конфиг Nx / dev-server |

**Важно:** в `backend/.env` поле `DATABASE_URL` должно указывать на тот же хост и порт Postgres, что проброшены из Docker (для канона: `...@localhost:5432/...`).

## Полный сброс Docker-стека CRM на машине

Удаляет контейнеры проекта **и именованные тома** (`crm_pgdata`, `crm_backups`) — **данные БД в Docker пропадут**.

Из корня репозитория:

```bash
docker compose down -v --remove-orphans
```

Только Postgres (без backend/web), тот же эффект для тома БД:

```bash
docker compose stop postgres
docker compose rm -f postgres
docker volume rm crm_pgdata
```

(имя тома проверьте: `docker volume ls`)

## Если всё же нужен другой порт Postgres

Меняйте **сразу два места**: `POSTGRES_PORT` в `deploy/.env` **и** порт в `DATABASE_URL` в `backend/.env`. Иначе API будет отдавать 500 из‑за недоступной БД.

Подробнее о запуске без моков: `docs/frontend/backend-enable-runbook.md`, `backend/README.md`.
