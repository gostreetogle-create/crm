# TODO Before Deploy

## ⚠️ КРИТИЧНЫЕ ЗАДАЧИ (12 минут)

### ☐ 1. Обновить версии (2 мин)

**Файлы:**
- `crm-web/package.json` → `"version": "1.0.0"`
- `backend/package.json` → `"version": "1.0.0"`

**Текущее:** `0.0.0`  
**Нужно:** `1.0.0` или `0.1.0`

---

### ☐ 2. Запустить Release Gate (5 мин)

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate -ReportPath "./release-gate-report.json"
```

**Проверяет:**
- Backend critical tests
- Frontend critical tests
- E2E smoke tests

**STOP-LIST:** Если gate красный — деплой блокируется!

---

### ☐ 3. Настроить deploy/.env (3 мин)

**На сервере:**

```bash
cd /путь/к/репо/deploy
cp .env.example .env
nano .env
```

**Обязательные поля:**
- `CORS_ORIGIN=http://ваш-сервер:8080`
- `JWT_SECRET=<минимум 16 символов>`
- `CRM_POSTGRES_PASSWORD=<надёжный пароль>`
- `BACKEND_PORT=3000`
- `WEB_PORT=8080`
- `POSTGRES_PORT=5432`

---

## 🚀 ДЕПЛОЙ (2 минуты)

```bash
cd /путь/к/репо/deploy
bash ./deploy.sh
```

---

## ✅ ПРОВЕРКА (2 минуты)

```bash
# 1. Health check
curl http://сервер:8080/health

# 2. Открыть в браузере
http://сервер:8080

# 3. Smoke test:
# - Логин (director/director)
# - Создать КП
# - Изменить статус КП
# - Создать заказ из оплаченного КП
```

---

## 📋 НЕКРИТИЧНЫЕ ЗАДАЧИ (после деплоя)

### ☐ 4. Backend RAL Colors API

**Файл:** `docs/backend/RAL-COLORS-API-TASK.md`  
**Действие:** Создать issue и назначить на backend  
**Оценка:** 2-3 дня

---

### ☐ 5. КП A4 печать

**Файл:** Удалён (не критично для релиза)  
**Действие:** Запросить у дизайнера PDF эталон  
**Оценка:** Зависит от дизайнера

---

### ☐ 6. Store Migration UI smoke

**Файл:** `docs/frontend/store-migration-checklist.md`  
**Действие:** 15 мин ручного теста  
**Оценка:** 15 минут

---

## 📊 СТАТУС

| Задача | Статус | Время |
|--------|--------|-------|
| 1. Версии | ⚠️ TODO | 2 мин |
| 2. Gate | ⚠️ TODO | 5 мин |
| 3. .env | ⚠️ TODO | 3 мин |
| **ДЕПЛОЙ** | ⏳ Ждёт | 2 мин |
| Проверка | ⏳ Ждёт | 2 мин |
| **ИТОГО** | | **12 мин** |

---

---

**Начать с:** Обновить версии → Запустить gate → Настроить .env → Деплой
