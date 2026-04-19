# Deployment Ready Status (2026-04-19)

## ✅ ГОТОВО К ДЕПЛОЮ

### Build Artifacts

- ✅ Backend: `backend/dist/` — 37 compiled files
- ✅ Frontend: `crm-web/dist/crm-web/browser/` — production build
- ✅ Archive: `deploy/prebuilt-web.zip` — ready for server

### Configuration

- ✅ `backend/.env.example` — up to date
- ✅ `deploy/.env.example` — up to date
- ✅ `docker-compose.yml` — configured
- ✅ Deploy scripts — ready (`deploy.sh`, gate scripts)

### Code Quality

- ✅ No critical errors in codebase
- ✅ Store Migration architecture verified
- ✅ No blocking TODOs/FIXMEs

## ⚠️ ПЕРЕД ДЕПЛОЕМ

### 1. Обновить версии (ОБЯЗАТЕЛЬНО)

**Текущие версии: 0.0.0**

```json
// crm-web/package.json
"version": "1.0.0"  // или 0.1.0

// backend/package.json
"version": "1.0.0"  // или 0.1.0
```

### 2. Запустить Release Gate (ОБЯЗАТЕЛЬНО)

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"
```

**STOP-LIST:** Если gate красный — деплой блокируется!

### 3. Настроить deploy/.env (ОБЯЗАТЕЛЬНО)

Скопировать `deploy/.env.example` → `deploy/.env` и заполнить:

- `CORS_ORIGIN` — URL сайта (например: `http://192.168.1.100:8080`)
- `JWT_SECRET` — минимум 16 символов (production)
- `CRM_POSTGRES_PASSWORD` — надёжный пароль

## 🚀 ДЕПЛОЙ (3 КОМАНДЫ)

```powershell
# 1. Gate с артефактом
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"

# 2. Пересобрать архив (если нужно)
powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1

# 3. На сервере
cd /путь/к/репо/deploy
bash ./deploy.sh
```

## 📋 ОСТАЛОСЬ СДЕЛАТЬ

### Критичное (перед деплоем)

1. ⚠️ **Обновить версии** в package.json (5 мин)
2. ⚠️ **Запустить gate** и получить зелёный отчёт (10 мин)
3. ⚠️ **Настроить deploy/.env** на сервере (5 мин)

### Некритичное (после деплоя)

4. 📋 **Backend RAL Colors API** — задача готова, назначить на backend
5. 📋 **КП A4 печать** — запрос готов, отправить дизайнеру
6. 📋 **Store Migration UI smoke** — 15 мин ручного теста

## 📊 СТАТИСТИКА

- **Node.js:** v24.15.0
- **Angular:** 21.2.0
- **Nx:** 22.6.1
- **Prisma:** 6.3.0
- **Backend files:** 37 compiled
- **Frontend chunks:** 14 optimized

## 🔗 ДОКУМЕНТАЦИЯ

- [`PRE-DEPLOY-CHECKLIST.md`](PRE-DEPLOY-CHECKLIST.md) — детальный чеклист
- [`docs/release-gates.md`](docs/release-gates.md) — gate правила
- [`deploy/README.md`](deploy/README.md) — инструкция деплоя
