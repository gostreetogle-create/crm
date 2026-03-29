# Справочник «Пользователи» на `/dictionaries`

## Назначение

Каталог учётных записей до появления полноценного API пользователей: логин, пароль (в mock — открытый текст), ФИО, email, телефон, **роль** из справочника «Роли» (`RoleItem.id`).

Это **основное место**, где по смыслу продукту директор или администратор назначает человеку роль в организации. Переключатель «роль сессии» на странице **«Настройки»** (`/preferences`) до появления бэкенда — отдельно: только имитация в текущей вкладке браузера, на записи пользователей не влияет (см. [`rbac-and-admin-settings.md`](./rbac-and-admin-settings.md)).

## Где в коде

| Путь | Роль |
|------|------|
| `crm-web/src/app/features/users/model/user-item.ts` | Типы `UserItem`, `UserItemInput`. |
| `crm-web/src/app/features/users/data/users.repository.ts` | Контракт + токен `USERS_REPOSITORY`. |
| `crm-web/src/app/features/users/data/users.mock-repository.ts` | Mock-хранилище (`BehaviorSubject`). |
| `crm-web/src/app/features/users/data/users.seed.ts` | Начальные записи (например `demo` / суперадмин). |
| `crm-web/src/app/features/users/state/users.store.ts` | `UsersStore`: снимок + `usersData()` для таблицы; подписан на роли для подписи колонки «Роль». |
| `crm-web/src/app/app.config.ts` | `UsersMockRepository` + `USERS_REPOSITORY` (`useExisting`). |
| `crm-web/src/app/features/dictionaries/pages/dictionaries-page/*` | Плитка `tileKey="users"`, модалка, Excel. |

Доступ к плитке: ключ **`dict.hub.users`** (см. `dict-hub-permissions.ts`, матрица в «Админ-настройках»).

## Поведение

- **Плитка:** узкая карточка хаба (как «Роли»): превью одной строки, раскрытие через общий паттерн `HubCrudExpandStateService`.
- **Роль:** `<select>` заполняется **активными** ролями из `RolesStore.matrixRoleColumns()` (порядок по `sortOrder`, затем по названию).
- **Пароль:** при создании и дублировании обязателен (мин. 4 символа); при редактировании пустое поле = **не менять** (mock-репозиторий сохраняет прежнее значение).
- **Просмотр:** пароль не отображается.
- **Excel:** колонки `Логин`, `ФИО`, `Email`, `Телефон`, `Код роли`, `Пароль`; роль сопоставляется по **коду** роли из справочника; экспорт пароля маскируется `***`.

## Важно для бэкенда

- Хранить пароль только в виде **хеша**; не логировать и не отдавать в экспортах.
- Связь пользователя с ролью — по **id** роли на сервере (стабильный FK).
- После API: заменить `USERS_REPOSITORY` на HTTP-реализацию; контракт `UserItem` согласовать с DTO.

## Связанные документы

- Роли и права: [`rbac-and-admin-settings.md`](./rbac-and-admin-settings.md).
- Паттерн плиток хаба: [`dictionaries-crud-playbook.md`](./dictionaries-crud-playbook.md).
