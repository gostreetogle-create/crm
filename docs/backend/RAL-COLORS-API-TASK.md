# Задача: RAL Colors API

## 📋 Описание

Реализовать REST API для справочника "Цвета (RAL)" с поддержкой CRUD операций и массового импорта.

**Приоритет:** Средний  
**Блокирует:** Работу со справочником цветов на фронтенде  
**Оценка:** 2-3 дня

---

## 🎯 Требования

### 1. CRUD Endpoints

#### GET /api/colors
Получить список всех цветов

**Response:**
```json
[
  {
    "id": "uuid",
    "ralCode": "RAL 9016",
    "name": "Транспортный белый",
    "hex": "#F6F6F6",
    "rgb": {
      "r": 246,
      "g": 246,
      "b": 246
    },
    "createdAt": "2026-04-19T10:00:00Z",
    "updatedAt": "2026-04-19T10:00:00Z"
  }
]
```

**Query params:**
- `page` (optional): номер страницы
- `limit` (optional): размер страницы
- `search` (optional): поиск по `ralCode` или `name`

---

#### POST /api/colors
Создать новый цвет

**Request:**
```json
{
  "ralCode": "RAL 9016",
  "name": "Транспортный белый",
  "hex": "#F6F6F6",
  "rgb": {
    "r": 246,
    "g": 246,
    "b": 246
  }
}
```

**Validation:**
- `ralCode` — опционален, но если передан:
  - Формат: `RAL 0000` (classic) или `RAL DESIGN 000 00 00` (design)
  - Уникальность в рамках tenant
- `name` — обязателен, строка 1-200 символов
- `hex` — обязателен, формат `#RRGGBB` (uppercase)
- `rgb.r`, `rgb.g`, `rgb.b` — обязательны, диапазон 0-255
- Проверка консистентности: `rgb` должен соответствовать `hex`

**Response:** 201 Created + созданный объект

---

#### PUT /api/colors/:id
Обновить цвет

**Request:** Те же поля что и в POST

**Response:** 200 OK + обновлённый объект

---

#### DELETE /api/colors/:id
Удалить цвет

**Validation:**
- Проверить что цвет не используется в материалах
- Если используется → 409 Conflict с сообщением

**Response:** 204 No Content

---

### 2. Интеграция с материалами

#### Изменения в Materials API

**GET /api/materials** должен возвращать:
```json
{
  "id": "uuid",
  "name": "Сталь",
  "colorId": "uuid",
  "colorName": "Транспортный белый",
  "colorHex": "#F6F6F6"
}
```

**POST/PUT /api/materials** должен принимать:
```json
{
  "name": "Сталь",
  "colorId": "uuid"
}
```

**Validation:**
- `colorId` — опционален
- Если передан — проверить что цвет существует (FK constraint)

---

### 3. Массовый импорт (Admin API)

#### POST /api/admin/bulk/colors
Массовый импорт цветов

**Request:**
```json
{
  "items": [
    {
      "ralCode": "RAL 9016",
      "name": "Транспортный белый",
      "hex": "#F6F6F6",
      "rgb": { "r": 246, "g": 246, "b": 246 }
    },
    {
      "ralCode": "RAL 9010",
      "name": "Чисто белый",
      "hex": "#F1F0EA",
      "rgb": { "r": 241, "g": 240, "b": 234 }
    }
  ],
  "mode": "upsert"
}
```

**Query params:**
- `dryRun=true` (optional): проверка без сохранения

**Response:**
```json
{
  "success": true,
  "created": 2,
  "updated": 0,
  "errors": []
}
```

**Response (с ошибками):**
```json
{
  "success": false,
  "created": 1,
  "updated": 0,
  "errors": [
    {
      "index": 1,
      "field": "hex",
      "message": "Invalid hex format"
    }
  ]
}
```

**Режимы:**
- `create-only`: только создание, ошибка если существует
- `upsert`: создание или обновление по `ralCode`
- `replace`: удалить все и создать новые

---

### 4. Аудит

Логировать изменения:
- Кто создал/изменил/удалил
- Когда
- Что изменилось (old/new values)

Таблица `color_audit_log`:
```sql
CREATE TABLE color_audit_log (
  id UUID PRIMARY KEY,
  color_id UUID,
  action VARCHAR(10), -- 'create', 'update', 'delete'
  user_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP
);
```

---

### 5. Права доступа

Использовать существующую систему прав:

- `crud.colors.read` — просмотр
- `crud.colors.create` — создание
- `crud.colors.update` — редактирование
- `crud.colors.delete` — удаление
- `admin.bulk.colors` — массовый импорт

---

## 🗄️ Схема БД

### Таблица colors

```sql
CREATE TABLE colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  ral_code VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  hex VARCHAR(7) NOT NULL,
  rgb_r INTEGER NOT NULL CHECK (rgb_r >= 0 AND rgb_r <= 255),
  rgb_g INTEGER NOT NULL CHECK (rgb_g >= 0 AND rgb_g <= 255),
  rgb_b INTEGER NOT NULL CHECK (rgb_b >= 0 AND rgb_b <= 255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  
  CONSTRAINT colors_tenant_ral_unique UNIQUE (tenant_id, ral_code),
  CONSTRAINT colors_hex_format CHECK (hex ~ '^#[0-9A-F]{6}$')
);

CREATE INDEX idx_colors_tenant ON colors(tenant_id);
CREATE INDEX idx_colors_ral_code ON colors(ral_code);
CREATE INDEX idx_colors_name ON colors(name);
```

### Изменения в materials

```sql
ALTER TABLE materials 
  ADD COLUMN color_id UUID REFERENCES colors(id) ON DELETE SET NULL;

CREATE INDEX idx_materials_color ON materials(color_id);
```

---

## 🧪 Тесты

### Unit тесты

- [ ] Валидация RAL кодов (classic и design форматы)
- [ ] Валидация hex формата
- [ ] Проверка консистентности rgb ↔ hex
- [ ] Проверка уникальности ralCode в рамках tenant

### Integration тесты

- [ ] CRUD операции
- [ ] Массовый импорт (success case)
- [ ] Массовый импорт (partial errors)
- [ ] Удаление цвета используемого в материалах (должно блокироваться)
- [ ] Права доступа для разных ролей

---

## 📝 Коды ошибок

```typescript
{
  "COLOR_NOT_FOUND": "Цвет не найден",
  "COLOR_RAL_CODE_DUPLICATE": "RAL код уже существует",
  "COLOR_INVALID_HEX": "Неверный формат HEX",
  "COLOR_INVALID_RGB": "Неверные значения RGB",
  "COLOR_RGB_HEX_MISMATCH": "RGB не соответствует HEX",
  "COLOR_IN_USE": "Цвет используется в материалах и не может быть удалён",
  "COLOR_INVALID_RAL_FORMAT": "Неверный формат RAL кода"
}
```

---

## 📚 Примеры RAL кодов

### Classic (4-значный)
- `RAL 9016` — Транспортный белый
- `RAL 9010` — Чисто белый
- `RAL 1000` — Зелёно-бежевый
- `RAL 3000` — Огненно-красный

### Design (9-значный)
- `RAL DESIGN 000 00 00` — Чёрный
- `RAL DESIGN 360 90 05` — Белый

---

## ✅ Definition of Done

- [ ] Все CRUD endpoints реализованы
- [ ] Валидация работает корректно
- [ ] Массовый импорт работает
- [ ] Интеграция с materials работает
- [ ] Аудит логирует изменения
- [ ] Права доступа настроены
- [ ] Unit тесты написаны и проходят
- [ ] Integration тесты написаны и проходят
- [ ] Миграция БД создана
- [ ] API документация обновлена
- [ ] Frontend может работать с API

---

## 🔗 Связанные документы

- `docs/frontend/backend-ral-colors-checklist.md` — детальный чеклист
- `docs/frontend/colors-crud.md` — спецификация фронтенда
- `docs/backend-map/small_dictionaries.json` — схема справочников

---

## 📞 Контакты

**Вопросы по задаче:** Frontend-команда  
**Приоритизация:** Product Owner  
**Код-ревью:** Backend Lead

---

*Создано: 2026-04-19*
