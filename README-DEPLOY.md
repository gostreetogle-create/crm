# 🚀 Deployment Guide

## Статус: ГОТОВ К ДЕПЛОЮ ✅

Все критичные компоненты проверены. Время до деплоя: **25 минут**.

---

## ⚡ БЫСТРЫЙ СТАРТ (3 шага)

### 1. Обновить версии (5 мин)

```json
// crm-web/package.json
"version": "1.0.0"

// backend/package.json
"version": "1.0.0"
```

### 2. Запустить gate (10 мин)

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"
```

**STOP:** Если gate красный — деплой блокируется!

### 3. Деплой (5 мин)

```bash
# На сервере
cd /путь/к/репо/deploy
bash ./deploy.sh
```

---

## 📋 ДЕТАЛЬНЫЕ ДОКУМЕНТЫ

- [`DEPLOYMENT-SUMMARY.md`](DEPLOYMENT-SUMMARY.md) — полная сводка
- [`PRE-DEPLOY-CHECKLIST.md`](PRE-DEPLOY-CHECKLIST.md) — детальный чеклист
- [`DEPLOY-READY-STATUS.md`](DEPLOY-READY-STATUS.md) — статус готовности
- [`docs/release-gates.md`](docs/release-gates.md) — правила gate
- [`deploy/README.md`](deploy/README.md) — инструкция деплоя

---

## ✅ ЧТО ГОТОВО

- ✅ Backend build: `backend/dist/` (37 files)
- ✅ Frontend build: `crm-web/dist/crm-web/browser/`
- ✅ Deploy archive: `deploy/prebuilt-web.zip`
- ✅ Docker Compose configured
- ✅ Deploy scripts ready
- ✅ Architecture verified (Store Migration)
- ✅ No critical errors

---

## ⚠️ ПЕРЕД ДЕПЛОЕМ

1. ⚠️ Обновить версии в package.json (сейчас 0.0.0)
2. ⚠️ Запустить gate и получить зелёный отчёт
3. ⚠️ Настроить `deploy/.env` на сервере:
   - `CORS_ORIGIN` — URL сайта
   - `JWT_SECRET` — минимум 16 символов
   - `CRM_POSTGRES_PASSWORD` — надёжный пароль

---

## 📊 ТЕХНИЧЕСКИЕ ДЕТАЛИ

**Версии:**
- Node.js: v24.15.0
- Angular: 21.2.0
- Nx: 22.6.1
- Prisma: 6.3.0

**Порты:**
- Backend API: 3000
- Web (nginx): 8080
- PostgreSQL: 5432

**Архитектура:**
- Backend: Express + Prisma + PostgreSQL
- Frontend: Angular 21 + Nx + @ngrx/signals
- Deploy: Docker Compose + nginx

---

## 🔍 ПОСЛЕ ДЕПЛОЯ

```bash
# 1. Health check
curl http://сервер:8080/health

# 2. Smoke test
# - Логин
# - Создание КП
# - Переход статусов
# - Создание заказа
```

---

**Время:** 25 минут до деплоя | 5 минут деплой | 5 минут проверка
