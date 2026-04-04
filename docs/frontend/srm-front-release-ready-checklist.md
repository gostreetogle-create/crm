# SRM Front Release-Ready Checklist

Цель: критерии переключения с `crm-web` на `srm-front` без потери функциональности и с безопасным rollback.

## 1) Functional Parity

- [ ] Login/logout + восстановление сессии (`/auth/me`) работают стабильно.
- [ ] Права/guards/директивы дают тот же доступ, что в `crm-web`.
- [ ] Справочники: CRUD + импорт/экспорт + каскадные сценарии работают без регрессий.
- [ ] Админ-настройки (матрица прав, field-rules, backups, карточка «Система и обслуживание» / статус БД) доступны и соответствуют текущему поведению.

## 2) Build/Test/Lint Gates

- [x] `npx nx build srm-front --configuration=development`
- [x] `npx nx build srm-front --configuration=production`
- [x] `npx nx test srm-front`
- [x] `npx nx lint srm-front`
- [x] `npx nx build crm-web --configuration=development` (контроль отсутствия регресса в legacy)

## 3) Architecture Gates

- [ ] Нет deep-import в app-слое, только public API `@srm/*`.
- [ ] Нет циклических зависимостей между библиотеками.
- [ ] Теги проектов (`type:*`, `scope:*`) согласованы с `eslint.base.config.mjs`.
- [ ] Все ключевые доменные части вынесены из `src/app` в libs.

## 4) Observability / Ops

- [ ] Логи auth/hydrate не шумят в штатных сценариях.
- [ ] Ошибки API отображаются пользователю корректно.
- [x] Есть минимальный smoke-runbook для ручной проверки после деплоя.
- [x] Backend: JSON-строки диагностики в stderr, `X-Request-Id` / `requestId` в ответах 5xx и 503, опционально `CRM_DIAGNOSTIC_LOG_FILE`; админ UI: статус БД/миграций и команды (`docs/dev-logs-and-diagnostics.md`).

## 5) Rollback Plan

- [ ] Подготовлен fallback-маршрут/флаг на `crm-web`.
- [ ] Известен последний стабильный commit для отката.
- [ ] Проверен сценарий быстрого возврата (без force-push по умолчанию).

## 6) Sign-off

- [ ] Технический sign-off (архитектура/качество кода).
- [ ] Product/UX sign-off (потоки и визуальная parity).
- [ ] Финальный go/no-go чек выполнен.
