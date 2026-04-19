# Спринт до сдачи (≈6 дней): объём, проверки, выкладка

Практическая форма **короткого спринта до сдачи** для команды: зафиксировать MVP, ежедневно гонять автоматические шаги, в конце — полный gate и smoke. Канон команд: [release-gates.md](./release-gates.md), запуск стека: [backend/README.md](../backend/README.md), [backend-enable-runbook.md](./frontend/backend-enable-runbook.md).

---

## День 0 — зафиксировать «что считается сдано»

### Must-have (заполнить перед стартом спринта)

| # | Сценарий | Критерий готовности | Владелец / статус |
|---|-----------|---------------------|-------------------|
| 1 | Вход в систему (JWT, сессия) | Успешный логин тестовым пользователем из seed | |
| 2 | | | |
| 3 | | | |

Примеры строк, если актуально для вашего релиза: хаб `/dictionaries` (CRUD минимум по одному справочнику); КП/статусы — ориентир [commercial-offers-bl-roadmap.md](./frontend/commercial-offers-bl-roadmap.md); заказы из оплаченного КП.

### Вне объёма (explicitly out of scope на эти дни)

| # | Что не делаем | Почему |
|---|----------------|--------|
| 1 | | |
| 2 | | |

### Ручной smoke на приёмку (день 6, 30–60 мин)

Отметьте чекбоксами в день приёмки.

- [ ] Postgres поднят, `DATABASE_URL` совпадает с портом ([dev-local-ports.md](./dev-local-ports.md)).
- [ ] `GET /health` и `GET /api/health` отвечают `ok`.
- [ ] Логин под **admin** (или согласованной ролью).
- [ ] Логин под второй ролью с **меньшим** набором прав — нет «лишних» пунктов меню / 403 на запрещённое.
- [ ] Один полный must-have из таблицы выше (скопируйте название сюда): _______________
- [ ] Пустой/ошибочный случай: например выход и повторный вход; или пустой список без падения UI.
- [ ] (Если трогали роли) после изменений seed: `npm run sync:canonical-roles` в `crm-web/`, `npm run authz:check` в `backend/`.

---

## Каждый вечер (дни 1–4) — автоматические gate

Один запуск из корня репозитория:

**Windows**

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-daily-gates.ps1
```

С проверкой матрицы прав (после правок ролей/ключей):

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/run-daily-gates.ps1 -Authz
```

**Linux / macOS**

```bash
bash deploy/scripts/run-daily-gates.sh
bash deploy/scripts/run-daily-gates.sh --authz
```

Что внутри: `backend` — `doctor`, `build`, `test:critical` [и опционально `authz:check:ci`]; `crm-web` — `build`, `test:critical`. Требуются `npm` в `PATH` и установленные `node_modules` в обоих пакетах.

Справка: `powershell ... run-daily-gates.ps1 -Help` / `bash ... run-daily-gates.sh --help`.

---

## День 5 — заморозка: без новых фич

- Закрыть только блокеры из must-have.
- Полный контур из [release-gates.md](./release-gates.md):  
  `run-release-gate.ps1` / `run-release-gate.sh` (при необходимости без миграций: `-SkipMigrate` / `--skip-migrate`).
- По времени: полный `npm test` в `backend/`, выборочно `nx test` по затронутым библиотекам в `crm-web/`.
- Опционально: [performance-and-build-checklist.md](./frontend/performance-and-build-checklist.md) — только если остался буфер.

---

## День 6 — «чистая» приёмка и прод

1. **Чистая связка** (как у нового разработчика): Postgres → миграции и seed по [backend/README.md](../backend/README.md) → `npm run dev` в `backend/` → `npm start` в `crm-web/` ([backend-enable-runbook.md](./frontend/backend-enable-runbook.md)).
2. Пройти чеклист **«Ручной smoke на приёмку»** выше.
3. **Прод-статика** не попадает на сервер одним `git push`: [development-workflow.md](./frontend/development-workflow.md) (раздел про `prebuilt-web`), [deploy/README.md](../deploy/README.md) — production-сборка, `pack-prebuilt-web`, на сервере `deploy.sh`.

---

## Краткая шпаргалка

| Когда | Команда / документ |
|--------|-------------------|
| Каждый вечер | `deploy/scripts/run-daily-gates.ps1` или `.sh` |
| Перед выкладкой | [release-gates.md](./release-gates.md) — `run-release-gate` + при необходимости `pack-prebuilt-web` |
| Локальный стек | [backend-enable-runbook.md](./frontend/backend-enable-runbook.md) |
