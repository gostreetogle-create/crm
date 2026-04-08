import type { BulkJsonTargetId } from './bulk-json-import-card.targets';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FLEX_DATE_RE = /^(?:\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})$/;

function isUuid(s: unknown): boolean {
  return typeof s === 'string' && UUID_RE.test(s.trim());
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function optionalStringMatches(v: unknown, re: RegExp): boolean {
  if (v == null) return true;
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return s.length === 0 || re.test(s);
}

/**
 * Локальная проверка перед POST — должна совпадать по смыслу с Zod на бэкенде (`bulk.routes.ts`),
 * чтобы «Проверить» не давал ложный успех и 400 на сохранении.
 */
export function validateBulkDraftForTarget(
  targetId: BulkJsonTargetId,
  body: { items: unknown[] },
): string | null {
  const items = body.items;
  if (!Array.isArray(items)) {
    return 'В корне нужен массив items.';
  }
  if (items.length === 0) {
    return 'Массив items пуст — нечего сохранять (добавьте строки).';
  }

  switch (targetId) {
    case 'units': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (Array.isArray(o['lines'])) {
          return (
            'Файл похож на JSON торговых товаров (есть массив lines). В списке «Таблица» выберите «Товары» ' +
            'или загрузите JSON для единиц измерения (поля name, code, notes, isActive).'
          );
        }
        if (!nonEmptyString(o['name'])) {
          return `Элемент ${i}: для единиц нужно непустое поле name.`;
        }
      }
      return null;
    }
    case 'colors': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name']) || !nonEmptyString(o['hex'])) {
          return `Элемент ${i}: нужны непустые name и hex.`;
        }
        for (const k of ['rgbR', 'rgbG', 'rgbB'] as const) {
          if (typeof o[k] !== 'number' || !Number.isInteger(o[k] as number)) {
            return `Элемент ${i}: ${k} — целое число.`;
          }
        }
      }
      return null;
    }
    case 'surface_finishes': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['finishType']) || !nonEmptyString(o['roughnessClass'])) {
          return `Элемент ${i}: нужны непустые finishType и roughnessClass.`;
        }
      }
      return null;
    }
    case 'coatings': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['coatingType']) || !nonEmptyString(o['coatingSpec'])) {
          return `Элемент ${i}: нужны непустые coatingType и coatingSpec.`;
        }
      }
      return null;
    }
    case 'geometries': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name']) || !nonEmptyString(o['shapeKey'])) {
          return `Элемент ${i}: нужны непустые name и shapeKey.`;
        }
      }
      return null;
    }
    case 'material_characteristics': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name'])) {
          return `Элемент ${i}: нужно непустое поле name.`;
        }
      }
      return null;
    }
    case 'materials': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name'])) {
          return `Элемент ${i}: нужно непустое поле name.`;
        }
        if (!isUuid(o['materialCharacteristicId'])) {
          return `Элемент ${i}: materialCharacteristicId — uuid.`;
        }
        if (!isUuid(o['geometryId'])) {
          return `Элемент ${i}: geometryId — uuid.`;
        }
      }
      return null;
    }
    case 'production_work_types': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name']) || !nonEmptyString(o['shortLabel'])) {
          return `Элемент ${i}: нужны непустые name и shortLabel.`;
        }
        const rate = o['hourlyRateRub'];
        if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 1) {
          return `Элемент ${i}: hourlyRateRub — число не меньше 1.`;
        }
      }
      return null;
    }
    case 'roles': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['code']) || !nonEmptyString(o['name'])) {
          return `Элемент ${i}: нужны непустые code и name.`;
        }
        if (typeof o['sortOrder'] !== 'number' || !Number.isInteger(o['sortOrder'])) {
          return `Элемент ${i}: sortOrder — целое число.`;
        }
        if (o['id'] != null && o['id'] !== '' && !isUuid(o['id'])) {
          return `Элемент ${i}: id — uuid или пусто.`;
        }
      }
      return null;
    }
    case 'trade_goods': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object') {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name'])) {
          return `Элемент ${i}: нужно непустое поле name.`;
        }
        const kindRaw = String(o['kind'] ?? 'ITEM').trim().toUpperCase();
        if (kindRaw !== 'ITEM' && kindRaw !== 'COMPLEX') {
          return `Элемент ${i}: kind должен быть ITEM или COMPLEX.`;
        }
        const linesRaw = o['lines'];
        if (linesRaw != null && !Array.isArray(linesRaw)) {
          return `Элемент ${i}: поле lines должно быть массивом или отсутствовать.`;
        }
        const lines = (linesRaw as unknown[] | undefined) ?? [];
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j];
          if (!line || typeof line !== 'object') {
            return `Элемент ${i}, строка состава ${j}: ожидается объект.`;
          }
          const ref = line as {
            productId?: unknown;
            productCode?: unknown;
            productName?: unknown;
            tradeGoodId?: unknown;
            tradeGoodCode?: unknown;
            tradeGoodName?: unknown;
          };
          const hasProductId = typeof ref.productId === 'string' && ref.productId.trim().length > 0;
          const hasProductCode = typeof ref.productCode === 'string' && ref.productCode.trim().length > 0;
          const hasProductName = typeof ref.productName === 'string' && ref.productName.trim().length > 0;
          const hasTradeGoodId = typeof ref.tradeGoodId === 'string' && ref.tradeGoodId.trim().length > 0;
          const hasTradeGoodCode = typeof ref.tradeGoodCode === 'string' && ref.tradeGoodCode.trim().length > 0;
          const hasTradeGoodName = typeof ref.tradeGoodName === 'string' && ref.tradeGoodName.trim().length > 0;
          const hasAnyRef =
            hasProductId ||
            hasProductCode ||
            hasProductName ||
            hasTradeGoodId ||
            hasTradeGoodCode ||
            hasTradeGoodName;
          if (!hasAnyRef) {
            continue;
          }
          if (kindRaw === 'ITEM' && !hasProductId && !hasProductCode && !hasProductName) {
            return `Элемент ${i}, строка состава ${j}: для ITEM нужен productName/productCode/productId.`;
          }
          if (kindRaw === 'COMPLEX' && !hasTradeGoodId && !hasTradeGoodCode && !hasTradeGoodName) {
            return `Элемент ${i}, строка состава ${j}: для COMPLEX нужен tradeGoodName/tradeGoodCode/tradeGoodId.`;
          }
        }
      }
      return null;
    }
    case 'clients': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        for (const k of ['lastName', 'firstName', 'patronymic', 'phone', 'address', 'email'] as const) {
          if (!nonEmptyString(o[k])) {
            return `Элемент ${i}: нужно непустое поле ${k}.`;
          }
        }
        if (o['id'] != null && o['id'] !== '' && !isUuid(o['id'])) {
          return `Элемент ${i}: id — uuid или пусто.`;
        }
      }
      return null;
    }
    case 'organizations': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name'])) {
          return `Элемент ${i}: нужно непустое поле name.`;
        }
        if (!optionalStringMatches(o['registrationDate'], FLEX_DATE_RE)) {
          return `Элемент ${i}: registrationDate — формат YYYY-MM-DD или DD.MM.YYYY.`;
        }
        if (!optionalStringMatches(o['createdAtSource'], FLEX_DATE_RE)) {
          return `Элемент ${i}: createdAtSource — формат YYYY-MM-DD или DD.MM.YYYY.`;
        }
        if (!optionalStringMatches(o['certificateIssuedDate'], FLEX_DATE_RE)) {
          return `Элемент ${i}: certificateIssuedDate — формат YYYY-MM-DD или DD.MM.YYYY.`;
        }
        if (o['id'] != null && o['id'] !== '' && !isUuid(o['id'])) {
          return `Элемент ${i}: id — uuid или пусто.`;
        }
      }
      return null;
    }
    case 'kp_photos': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name']) || !nonEmptyString(o['photoTitle'])) {
          return `Элемент ${i}: нужны непустые name и photoTitle.`;
        }
        if (!isUuid(o['organizationId'])) {
          return `Элемент ${i}: organizationId — uuid.`;
        }
        if (o['id'] != null && o['id'] !== '' && !isUuid(o['id'])) {
          return `Элемент ${i}: id — uuid или пусто.`;
        }
      }
      return null;
    }
    case 'users': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['login']) || !nonEmptyString(o['fullName']) || !nonEmptyString(o['email'])) {
          return `Элемент ${i}: нужны непустые login, fullName, email.`;
        }
        if (!nonEmptyString(o['phone'])) {
          return `Элемент ${i}: нужно непустое поле phone.`;
        }
        if (!isUuid(o['roleId'])) {
          return `Элемент ${i}: roleId — uuid роли.`;
        }
        const pwd = o['password'];
        if (pwd != null && pwd !== '' && (typeof pwd !== 'string' || pwd.length < 6)) {
          return `Элемент ${i}: password — не меньше 6 символов или оставьте пустым.`;
        }
        if (o['id'] != null && o['id'] !== '' && !isUuid(o['id'])) {
          return `Элемент ${i}: id — uuid или пусто.`;
        }
      }
      return null;
    }
    case 'production_details': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name'])) {
          return `Элемент ${i}: нужно непустое поле name.`;
        }
        if (o['id'] != null && o['id'] !== '' && !isUuid(o['id'])) {
          return `Элемент ${i}: id — uuid или пусто.`;
        }
      }
      return null;
    }
    case 'products': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name'])) {
          return `Элемент ${i}: нужно непустое поле name.`;
        }
        if (o['id'] != null && o['id'] !== '' && !isUuid(o['id'])) {
          return `Элемент ${i}: id — uuid или пусто.`;
        }
      }
      return null;
    }
    case 'complexes': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!nonEmptyString(o['name'])) {
          return `Элемент ${i}: нужно непустое поле name.`;
        }
        if (o['id'] != null && o['id'] !== '' && !isUuid(o['id'])) {
          return `Элемент ${i}: id — uuid или пусто.`;
        }
      }
      return null;
    }
    case 'catalog_products': {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          return `Элемент ${i}: ожидается объект.`;
        }
        const o = it as Record<string, unknown>;
        if (!isUuid(o['complexId'])) {
          return `Элемент ${i}: complexId — uuid комплекса.`;
        }
        if (!nonEmptyString(o['name'])) {
          return `Элемент ${i}: нужно непустое поле name.`;
        }
        const price = o['price'];
        if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
          return `Элемент ${i}: price — число ≥ 0.`;
        }
        if (o['id'] != null && o['id'] !== '' && !isUuid(o['id'])) {
          return `Элемент ${i}: id — uuid или пусто.`;
        }
      }
      return null;
    }
    default:
      return null;
  }
}
