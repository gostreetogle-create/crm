# Pre-Deploy Checklist (2026-04-19)

## ✅ Build Status

- ✅ **Backend build** — `backend/dist/` существует (37 файлов)
- ✅ **Frontend build** — `crm-web/dist/crm-web/browser/` существует
- ✅ **Deploy archive** — `deploy/prebuilt-web.zip` существует

## ✅ Configuration

- ✅ **Backend .env.example** — актуален
- ✅ **Deploy .env.example** — актуален
- ✅ **Docker compose** — готов к деплою
- ✅ **Deploy scripts** — `deploy.sh`, `run-release-gate.ps1/sh` готовы

## ⚠️ Versions

- ⚠️ **Frontend version** — `0.0.0` (нужно обновить перед релизом)
- ⚠️ **Backend version** — `0.0.0` (нужно обновить перед релизом)

## 📋 Pre-Deploy Tasks

### 1. Обновить версии (5 мин)

```bash
# Обновить версию в crm-web/package.json
# Обновить версию в backend/package.json
# Рекомендуемая версия: 1.0.0 или 0.1.0
```

### 2. Запустить release gate (10 мин)

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"

# Linux/macOS
bash deploy/scripts/run-release-gate.sh --skip-migrate --report-path "./release-gate-report.json"
```

**Stop-list:** Если gate красный — деплой не выполняем!

### 3. Проверить deploy/.env (2 мин)

- [ ] `CORS_ORIGIN` — правильный URL сайта
- [ ] `JWT_SECRET` — минимум 16 символов (production)
- [ ] `CRM_POSTGRES_PASSWORD` — надёжный пароль
- [ ] `BACKEND_PORT=3000`
- [ ] `WEB_PORT=8080`
- [ ] `POSTGRES_PORT=5432`

### 4. Деплой (3 шага)

```bash
# На сервере
cd /путь/к/репо/deploy
bash ./deploy.sh
```

## 📊 Code Quality

- ✅ **No critical TODOs** — найдено 0 критичных TODO/FIXME
- ✅ **Architecture** — Store Migration проверен
- ✅ **Tests** — critical tests готовы к запуску

## 🚀 Deployment Commands

### Минимальный сценарий (3 команды)

```powershell
# 1) Gate + артефакт
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"

# 2) Архив фронта (если нужно пересобрать)
powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1

# 3) Деплой на сервере
bash ./deploy.sh
```

## 📝 Post-Deploy

- [ ] Проверить `http://сервер:8080/health`
- [ ] Проверить логин в UI
- [ ] Проверить создание КП
- [ ] Проверить переход статусов КП

## 🔗 Документация

- [`docs/release-gates.md`](docs/release-gates.md) — полный gate checklist
- [`deploy/README.md`](deploy/README.md) — инструкция по деплою
- [`docs/README.md`](docs/README.md) — общая документация
