# Deployment Summary (2026-04-19)

## 🎯 СТАТУС: ГОТОВ К ДЕПЛОЮ

Проект проверен и готов к выкладке. Все критичные компоненты на месте.

## ✅ ЧТО ГОТОВО

### Сборка
- ✅ Backend скомпилирован: `backend/dist/` (37 файлов)
- ✅ Frontend собран: `crm-web/dist/crm-web/browser/` (production build)
- ✅ Архив готов: `deploy/prebuilt-web.zip`

### Конфигурация
- ✅ Docker Compose настроен
- ✅ Deploy скрипты готовы (`deploy.sh`, gate scripts)
- ✅ Environment примеры актуальны (`.env.example`)

### Код
- ✅ Архитектура проверена (Store Migration audit passed)
- ✅ Нет критичных ошибок
- ✅ TypeScript strict mode включён
- ✅ Console.log только в scripts/debug (допустимо)

## ⚠️ ПЕРЕД ДЕПЛОЕМ (20 минут)

### 1. Обновить версии (5 мин) ⚠️ ОБЯЗАТЕЛЬНО

Текущие версии: **0.0.0** → нужно обновить

```bash
# Отредактировать вручную:
# crm-web/package.json: "version": "1.0.0"
# backend/package.json: "version": "1.0.0"
```

### 2. Запустить Release Gate (10 мин) ⚠️ ОБЯЗАТЕЛЬНО

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"
```

**STOP:** Если gate красный — деплой блокируется!

### 3. Настроить deploy/.env (5 мин) ⚠️ ОБЯЗАТЕЛЬНО

```bash
# На сервере скопировать:
cp deploy/.env.example deploy/.env

# Заполнить обязательные поля:
# - CORS_ORIGIN=http://ваш-сервер:8080
# - JWT_SECRET=<минимум 16 символов>
# - CRM_POSTGRES_PASSWORD=<надёжный пароль>
```

## 🚀 ДЕПЛОЙ (3 команды, 5 минут)

```powershell
# 1. Gate + артефакт (если ещё не запускали)
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"

# 2. Пересобрать архив (только если изменили фронт)
powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1

# 3. На сервере
cd /путь/к/репо/deploy
bash ./deploy.sh
```

## 📋 ПОСЛЕ ДЕПЛОЯ (5 минут)

### Smoke Test

```bash
# 1. Проверить health
curl http://сервер:8080/health

# 2. Открыть в браузере
http://сервер:8080

# 3. Проверить основной функционал:
- Логин
- Создание КП
- Переход статусов КП
- Создание заказа из оплаченного КП
```

## 📊 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Версии
- Node.js: v24.15.0
- Angular: 21.2.0
- Nx: 22.6.1
- Prisma: 6.3.0

### Порты (по умолчанию)
- Backend API: 3000
- Web (nginx): 8080
- PostgreSQL: 5432
- Dev server (nx): 4200

### Архитектура
- Backend: Express + Prisma + PostgreSQL
- Frontend: Angular 21 + Nx + @ngrx/signals
- Deploy: Docker Compose + nginx

## 📝 НЕКРИТИЧНЫЕ ЗАДАЧИ (после деплоя)

1. **Backend RAL Colors API** — задача готова в `docs/backend/RAL-COLORS-API-TASK.md`
2. **КП A4 печать** — запрос дизайнеру в `docs/DESIGN-REQUEST-KP-A4.md`
3. **Store Migration UI smoke** — 15 мин ручного теста по `docs/SMOKE-TEST-GUIDE.md`

## 🔗 ДОКУМЕНТАЦИЯ

- [`PRE-DEPLOY-CHECKLIST.md`](PRE-DEPLOY-CHECKLIST.md) — детальный чеклист
- [`DEPLOY-READY-STATUS.md`](DEPLOY-READY-STATUS.md) — статус готовности
- [`docs/release-gates.md`](docs/release-gates.md) — правила gate
- [`deploy/README.md`](deploy/README.md) — инструкция деплоя

## ⚡ БЫСТРЫЙ СТАРТ

Если нужно максимально быстро:

```bash
# 1. Обновить версии в package.json (вручную)
# 2. Запустить gate
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"
# 3. Если зелёный — деплоить
bash deploy/deploy.sh
```

---

**Время до деплоя:** 20 минут (версии + gate + настройка .env)  
**Время деплоя:** 5 минут  
**Общее время:** 25 минут
