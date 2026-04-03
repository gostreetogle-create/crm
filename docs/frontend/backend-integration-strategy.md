# Интеграция с backend (текущее состояние)

Мок-репозитории и переключатель `useMockRepositories` **сняты**. Источник данных в приложении — **HTTP-репозитории** → Express API → **Prisma / PostgreSQL**.

## Паттерн

- Контракт модели и `*Repository` (интерфейс) в `crm-web/libs/*-data-access/`.
- Реализация: `*HttpRepository` (`@Injectable`, `HttpClient`, `API_CONFIG.baseUrl`).
- Подключение в DI: `provide: TOKEN, useExisting: XxxHttpRepository` (см. `crm-web/src/app/app.config.ts`, `crm-web/libs/dictionaries-hub-feature/.../dictionaries-route.providers.ts`).
- Авторизация: `SessionAuthService` — только через `/api/auth/login` и `/api/auth/me` (локальный вход без API не используется).

## Локальный запуск

См. **`docs/frontend/backend-enable-runbook.md`** (два процесса: backend + `nx serve`).

## История

Раньше описывался переход с моков на HTTP; сейчас канон — сразу API и БД. Устаревшие ссылки на `api-config.ts` в корне `src/app/core/` и на `*MockRepository` в документах не использовать.
