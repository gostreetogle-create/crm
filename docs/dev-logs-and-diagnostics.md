# Логи и диагностика (люди и ИИ)

Цель: быстро найти причину сбоя по **одному запросу**, не перегружая приложение.

## Админка: статус БД и миграции

В разделе **Админ-настройки** карточка **«Система и обслуживание»** запрашивает `GET /api/system/status` (нужны права админа). Там же кнопка **«Предупреждения и команды»**: готовые команды для сервера/локально и **промпт для ИИ** (копирование в буфер).

## Где смотреть

| Среда        | Команда / место |
|-------------|------------------|
| Docker, backend | `cd deploy && docker compose --env-file .env logs -f backend` |
| Docker, всё     | `docker compose --env-file .env logs -f` |
| Локально backend | терминал, где `npm run dev` |
| Nginx (web)   | `docker compose --env-file .env logs -f web` |
| Браузер       | DevTools → Console / Network (ответы API) |

## Корреляция: `requestId`

У каждого HTTP-запроса есть заголовок ответа **`X-Request-Id`** (или можно передать свой **`X-Request-Id`** с клиента).

При **500** и при **503 db_unavailable** в теле JSON часто есть поле **`requestId`** — то же значение.

В логах backend ищите строку с этим UUID.

## Формат строк в логах backend

Ошибки и сбои БД в админ-проверке пишутся **одной строкой JSON** в stderr, поля например:

- `ts` — ISO-время  
- `type` — `http_500` | `auth_admin_db_error` | `backup_scheduler_error` | `unhandledRejection` | `uncaughtException`  
- `requestId`, `method`, `path` — если относятся к запросу  
- `message`, `name`, `stack` (урезанный)

Пример для grep / ИИ: искать `"type":"http_500"` или конкретный `requestId`.

## Опционально: файл на диске

В `backend/.env`:

```env
# Дополнительно дублировать диагностические строки (append). Только ошибки, не весь трафик.
CRM_DIAGNOSTIC_LOG_FILE=/var/log/crm/diagnostic.log
```

В Docker путь должен быть в смонтированный volume, иначе запись не нужна — достаточно `docker logs`.

## Для ИИ при разборе инцидента

1. Взять **`requestId`** из ответа пользователя или из Network.  
2. Вытащить фрагмент логов: `docker compose ... logs backend --tail=500` и найти этот id или `"type":"http_500"`.  
3. По `path` + `stack` локализовать роут / сервис.  
4. Проверить миграции: в `backend/` `npx prisma migrate status`.

## Быстрый smoke перед push/PR (backend)

В `backend/`:

1. `npm run doctor` — preflight окружения и зависимостей.
2. `npm run build` — `prisma generate + tsc`.
3. `npm run authz:check` — строгая проверка матрицы при доступной БД.
4. Если БД временно недоступна в CI/smoke: `npm run authz:check:ci` (выведет SKIP, не уронит пайплайн).

## Что сознательно не делаем здесь

Нет тяжёлого APM, нет отправки каждого запроса на внешний сервис. При необходимости позже можно подключить Sentry/OpenTelemetry отдельно.

## Деплой и БД

Обычный `./deploy.sh` **не очищает** Postgres. Полный сброс только локальные скрипты в `deploy/scripts/` — см. `deploy/README.md`.
