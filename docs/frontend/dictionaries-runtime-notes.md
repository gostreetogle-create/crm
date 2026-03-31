# Справочники: заметки по рантайму (бэклог #17, #24–25, #42, #45–47, #49)

## #17 — Скролл к первой ошибке формы

После неуспешного submit (`markAllAsTouched`) вызывается `scrollToFirstInvalidControlInForm(formId, document)` из `dictionaries-form-a11y.ts` для всех модальных форм хаба, у которых в шаблоне задан `id` формы (`work-types-form`, `materials-form`, `material-characteristics-form`, геометрии, единицы, роли, пользователи, цвета, отделки, покрытия, клиенты, организации). Первый селектор: `input|select|textarea` с классом `ng-invalid` внутри формы.

## #24 — Лишние `loadItems` при навигации

При подозрении на лишние запросы: DevTools → Network, фильтр по API справочников; сравнить переход хаб ↔ плитка ↔ модалка. Цель — один оправданный запрос на список при открытии плитки. Профилирование Angular не зафиксировано в CI.

## #25 — Размер lazy-chunk `dictionaries-hub-feature`

Смотреть вывод `nx build crm-web` / `chunk` для `dictionaries-page` и общий index бандла. Снижение — только после распила монолита (`dictionaries-page.ts`).

## #42 — Async submit и standalone

Паттерн: `finishStandaloneDictionaryCreateIfMatch` после успешного submit; async-ветки (цвета/отделки/покрытия) — `firstValueFrom` + обновление store, затем `close*` и при необходимости `finishStandalone*`.

## #45 — Toast после сохранения

Если в продукте появится единый toast-сервис из design-system — подключать к submit после успешного ответа store; сейчас обратная связь через закрытие модалки / `back` и строку в таблице.

## #46 — Логирование ошибок submit

Политика: в проде не логировать PII в `console`; ошибки API — через централизованный error handler (если есть). В dev: `?debug=` на `/справочники/...` выводит `console.debug` с `route.data` (только `isDevMode()`).

## #47 — Ошибка сети / неуспешный submit

Store/repository слой уже задаёт сообщения пользователю; при добавлении глобального перехвата — не дублировать тексты в `dictionaries-page`.

## #49 — Скриншот-тесты

В репозитории нет Playwright/Cypress для UI; скриншоты — внешний инструмент или будущий e2e.

## E2E (#7–8, #28–29)

Полноценные E2E не внедрены; smoke — Jest-контракт маршрутов + ручные чеклисты.
