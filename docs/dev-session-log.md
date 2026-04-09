# Журнал сессий разработки

Короткая хронология **осмысленных шагов** (не каждая правка файла). Номер строки (`#`) — для устной отсылки («откатись к #3»); **фактический откат в git всегда по SHA**.

## Как откатиться

1. Найти строку в таблице и скопировать **Git SHA**.
2. Посмотреть изменения: `git show <SHA>`
3. Откат **без переписывания истории** (безопасно для уже запушенного `main`):  
   `git revert <SHA>..HEAD` или точечный `git revert <SHA>`
4. Откат **к состоянию коммита** (жёстко, только если согласовано):  
   `git reset --hard <SHA>` затем при необходимости `git push --force-with-lease` (осторожно на общей ветке).

Быстрый снимок без таблицы: `git log --oneline -20`.

---

## Как это работает (и для человека, и для ассистента)

1. **Git** хранит всю цепочку коммитов локально. В новом чате ассистент **не помнит** вчерашний push, но может в любой момент выполнить `git log --oneline -20` и получить актуальный список «несколько шагов назад».
2. **`docs/dev-session-log.md`** — дополнительный слой: **номер `#`**, дата и короткое описание **к выбранным** коммитам (не к каждой мелочи). Удобно говорить: «откат к #2» — ассистент сопоставляет строку с **Git SHA** из таблицы и с `git log`.
3. В Cursor включено правило **`.cursor/rules/rollback-and-history.mdc`**: при запросах про откат/версии ассистент обязан снять свежий `git log` и при наличии сверить с таблицей ниже.

Итог: **список шагов назад** всегда из **git**; **понятные подписи** — из таблицы, когда вы её пополняете после осмысленных шагов (не после каждого коммита).

**Если «случайно откатил» или нужно точно вернуться:** смотри колонку **Git SHA** у нужной строки и сравни с `git log`; при сомнении — `git show <SHA>`. Номер `#` — для устной отсылки («как в #42»); фактический откат в git всегда по **SHA**.

---

| # | UTC (примерно) | Действие | Область | Git SHA |
|---|----------------|----------|---------|---------|
| 1 | 2026-03-28 | Хаб справочников, swatch цвета в CRUD, удаление отдельных роутов materials/geometries, правки сторов и доков | crm-web, docs | `1872b50` |
| 2 | 2026-03-28 | Добавлен журнал сессий `dev-session-log.md` с правилами отката | docs | `060bb19` |
| 3 | 2026-03-28 | Правило Cursor `rollback-and-history.mdc` + раздел «Как это работает» в журнале | .cursor, docs | `c189a0c` |
| 4 | 2026-03-29 | Excel импорт/экспорт хаба, материалы и характеристики, RBAC/роли/пользователи, настройки, убран @defer у theme picker | crm-web, docs | `3202b0c` |
| 5 | 2026-03-30 | Админка: бэкапы БД (расписание, список, восстановление, скачивание), propagation снимков справочников local/global, усиление безопасности и Docker volume для архивов | backend, crm-web, deploy, docs | `f674c61` |
| 6 | 2026-03-30 | Рефактор: единый helper выбора колонок в маленьких fullscreen-плитках (свернуто=1, раскрыто=full) | crm-web | `4bdf7ee` |
| 7 | 2026-03-30 | Хаб: раскрытие только кнопкой, зелёное «нажато»; материалы и характеристики на fullscreen-плитке с fullWidth и превью колонок | crm-web | `29019fe` |
| 8 | 2026-03-30 | Каскад хаба из модалки материала (body portal, z-index вложенных модалок), организации и смежные правки бэкенда/доков | crm-web, backend, docs | `84ae9a4` |
| 9 | 2026-03-31 | Монорепа Nx: libs (data-access, auth, theme, ui-kit, feature-страницы), приложение `srm-front`, GitHub Actions `frontend-ci`, без сгенерированного nx-graph в docs | crm-web, .github, docs, deploy | `f475172` |
| 10 | 2026-03-31 | Хаб справочников: «+» создания у каждой кнопки выбора плитки, убран из тулбара таблицы; стиль primary как у CRUD | crm-web | `058cf34` |
| 11 | 2026-03-31 | Материал/характеристика: одна модалка с вкладками, «+» на полях, автоподстановка геометрии и характеристики после создания | crm-web | `68ed6d1` |
| 12 | 2026-03-31 | Справочники: standalone shell, quick-create, распил dictionaries-page (колонки/payload/utils), скролл к ошибке, тесты и CI; docs frontend/backend-map/analysis_hub; регенерация OVERVIEW | crm-web, docs, .cursor | `a3e6a46` |
| 13 | 2026-03-31 | Архитектурный аудит frontend, fail-fast CI гейты (workspace/parity), унификация route redirects между crm-web и srm-front, обновление канон-доков и видео-программы | crm-web, .github, docs | `50f205f` |
| 14 | 2026-03-31 | Повторный re-baseline цикла: подтверждение fail-fast поведения CI, актуализация master-аудита с post-check статусом и N/A границами применимости | docs/frontend | `a90194d` |
| 15 | 2026-03-31 | Полный master-аудит 1..53 по frontend, расширение канон-доков (field contracts/parity alias/release-ready) и обновление видео-программы под формат goals/scenario/demo/errors/DoD | docs/frontend, docs | `a57331a` |
| 16 | 2026-03-31 | Recovery-ветка frontend: восстановление Nx workspace файлов, full lint/test/build + smoke, добавлены контрактные тесты словарей и зафиксирован release-ready snapshot | crm-web, docs/frontend | `e2afdde` |
| 17 | 2026-03-31 | Включён параллельный AI UI/UX prompt в комитетный процесс: добавлен документ и ссылка в development-workflow, синхронизированы audit/release-ready статусы | docs/frontend | `980a1d5` |
| 18 | 2026-04-01 | Слит `recovery/nx-workspace-restore-2026-03-31` в `main` и запушен: выравнивание валидации ролей/пользователей, правки словарей/ui-kit форм, тесты payload/columns | crm-web, docs | `e015a9d` |
| 19 | 2026-04-01 | ui-kit: превью-карточки справочников (с фото и без); хаб: просмотр через карточку без фото, материалы с фото; crud-layout и NG8107 в dictionaries-page | crm-web | `2e8dd78` |
| 20 | 2026-04-01 | Модуль КП (kp-feature): конструктор, шаблон документа, витрина каталога с тулбаром (пагинация, «На странице»); ui-kit ProductCard; authz/маршруты, брендинг kp | crm-web | `183f989` |
| 21 | 2026-04-01 | КП: позиции только в превью документа (редактирование, удаление, print без кнопок); витрина — заголовок и README; убран демо-текст; fix track в шаблоне | crm-web | `3fbdf53` |
| 22 | 2026-04-01 | КП: один контакт организации в превью и печати, пересчёт суммы НДС при смене ставки %, доработки шаблона и маршрутов (app.config) | crm-web | `61b4e7f` |
| 23 | 2026-04-01 | КП: тулбар получателя, НДС/«всего к оплате», подсказка продолжения таблицы, справочник фото КП (Prisma, API, хаб, kp-photos-data-access) | crm-web, backend | `5152b1f` |
| 24 | 2026-04-02 | Справочники: детали производства и поставщик у материалов, Excel, статика фото КП в `public/kp-media` (`/kp-media/...`), правки таблицы CRUD и маппинга деталей, backend-map | crm-web, backend, deploy, docs | `abfb8b9` |
| 25 | 2026-04-03 | API справочников вместо моков, JWT-сессия, матрица RBAC (AppSetting, sanitize GET/PUT), ensureRolesLoaded и синк матрицы, админ UI и доки authz; миграция app_setting, Excel-валидации хаба | crm-web, backend, deploy, docs, .cursor | `aa99277` |
| 26 | 2026-04-03 | Справочник изделий (Product/ProductLine, API, хаб, Excel), доработки единого импорта excel-dictionaries, промпт для ИИ и кнопка копирования, crud-layout/ui-spec-table и доки | crm-web, backend, docs | `60c476a` |
| 27 | 2026-04-03 | Сборка web Docker: COPY backend/shared для @srm/canonical-roles; исправление [square] у кнопки копирования промпта Excel | deploy, crm-web | `b725d6f` |
| 28 | 2026-04-04 | Docker web: Nx/heap/workers + verbose, compose defaults и NODE_BUILD_HEAP_MB; docs/dev-local-ports; srm-front dev → :3000 + proxy; KP brand link | deploy, docs, crm-web | `217e694` |
| 29 | 2026-04-04 | Docker backend: strip CRLF entrypoint, COPY shared для seed, .gitattributes; .env.example CORS для compose | deploy | `aa548b6` |
| 30 | 2026-04-04 | Чеклист perf/build (~200 строк), первым в development-workflow; KP без PDF-ссылки; runbook ссылка | docs, crm-web | `7f99ee5` |
| 31 | 2026-04-04 | Распил dictionaries-page под лимит CI; canonical-roles для Jest (TS-зеркало JSON); platform-core passWithNoTests; правка TD-лога | crm-web, docs | `9e29653` |
| 32 | 2026-04-04 | Канон ролей: один JSON на бэкенде, генерация `canonical-roles.generated.ts`, CI/Docker sync, без дубля вручную | crm-web, backend, deploy, docs, .github | `62fac7e` |
| 33 | 2026-04-04 | Реестр HTTP `/api/admin` в `docs/backend-map/admin_api_routes.json`, регенерация `OVERVIEW.generated.md` | docs | `3291eff` |
| 34 | 2026-04-04 | Диагностика backend (requestId, JSON-логи), `/api/admin/system/status`, карточка «Система» и оглавление в админ-настройках, deploy-шпаргалка и скрипты сброса локальной БД, `docs/dev-logs-and-diagnostics.md` | backend, crm-web, deploy, docs, .cursor | `b1946eb` |
| 35 | 2026-04-04 | Прогон PR-чеклиста (gates + nx affected); синхронизация `pr-checklist`, authz-runbook, srm-front release-ready под ops/диагностику | docs/frontend | `e4fab93` |
| 36 | 2026-04-04 | Убраны предупреждения ESLint в Excel-валидаторах справочников (`any`/`!`); безопасные пути в KP recipient toolbar | crm-web | `42c0f26` |
| 37 | 2026-04-04 | Починка production build: методы Excel-импорта на `DictionariesPage` сделаны публичными для типизированных валидаторов; правка бэклога polish #37 | crm-web, docs/frontend | `43649c7` |
| 38 | 2026-04-04 | GitHub Actions: `backend-ci.yml` — `npm ci` + `npm run build` при изменениях в `backend/**` | .github, backend | `aa232c3` |
| 39 | 2026-04-04 | Push в `origin/main` накопленных коммитов (ops, CI, Excel-валидаторы, доки) | repo | `8e883ba` |
| 40 | 2026-04-04 | Снят Excel с хаба и админки: `POST /api/admin/bulk/units`, карточка в админ-настройках, `admin.bulk.units`; удалены excel-dictionaries и xlsx; MC utils → bulk-import; доки и backend-map | backend, crm-web, docs, scripts, справочники | `fcc319b` |
| 41 | 2026-04-04 | Docker web build: дефолт `NG_BUILD_MAX_WORKERS=1`, heap 3072 МБ, `NX_VERBOSE_LOGGING`; compose args + runbook про OOM на VPS | deploy, docs | `4c850d6` |
| 42 | 2026-04-05 | Push: каталог/комплексы (articles, products, trade goods, complexes), миграции Prisma, отступ под фикс-шапкой, nginx SPA для кириллицы, сообщения после restore, deploy env и правило prebuilt-web | backend, crm-web, deploy, docs, .cursor | `a4eeeaa` |
| 43 | 2026-04-07 | Push в `origin/main`: торговые позиции (фото/модалки/удаление), API trade-goods пустой состав и bulk JSON пустые строки, КП суммы без лишних `.00`, витрина КП, журнал отката | backend, crm-web, docs, .cursor | `b27b7c7` |
| 44 | 2026-04-07 | Push в `origin/main`: backend doctor + CI authz-check (skip без БД), асинхронная/строгая загрузка фото trade-goods, чистка warnings и helper preview-форматтеров | backend, crm-web, .github, docs | `b8267c1` |
| 45 | 2026-04-07 | Push в `origin/main`: units API чеклист — обязательный/уникальный `code`, ошибки `field/message`, фильтрация и пагинация GET, аудит CRUD операций единиц | backend | `2ec0a6c` |
| 46 | 2026-04-07 | Push в `origin/main`: минимальный Playwright smoke для srm-front (login→dictionaries, 404/403), non-blocking CI job `smoke-e2e`, обновлён runbook smoke | crm-web, .github, docs | `db2b1c2` |
| 47 | 2026-04-09 | Push в `origin/main`: стабилизация BL КП/заказов (statuses/orders/контракты/тесты) и единый release-gate/deploy контур (report, self-check, cross-platform runbook) | backend, crm-web, deploy, docs | `3eea6de` |
| 48 | 2026-04-09 | Push в `origin/main`: миграция frontend на store (KpBuilder, хаб справочников, админ-карточки, AppHealthStore), DI фасадов на маршруте `/справочники`, Playwright smoke, бюджеты `srm-front`, чеклист `store-migration-checklist.md` | crm-web, docs | `2002c9a` |
| 49 | 2026-04-09 | Push в `origin/main`: админка — дашборд статуса системы и API notices (команды для копирования); канон фронта — ИИ в критичных зонах, пост-пулл, целевая модульность; правки конфигов backend/crm-web; запись в журнале | crm-web, backend, docs | `712bc63` |

---

## Правила ведения

- **Не каждый коммит.** Одна строка таблицы = **одна завершённая задача** *или* **один push** (кратко: что в итоге выложили / зафиксировали). Промежуточные коммиты в ветке в журнал не обязательны.
- В колонке **Действие** — одно предложение: *что* изменилось для продукта/репо (чтобы по тексту можно было найти строку при откате).
- **Git SHA** — 7+ символов из `git log -1 --oneline` в момент записи (обычно сразу после push этой задачи).
- Нумерация `#` — сквозная по этому файлу (**следующий** номер = последний `#` в таблице + 1).
