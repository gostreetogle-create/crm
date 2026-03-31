import { FieldRuleRow } from './field-rule-row';

/**
 * Каталог правил полей (read-only витрина). Импорт/сохранение в коде позже используют те же профили по ключам.
 * Расширять по мере аудита справочников — см. `docs/frontend/dictionaries-data-and-import-rules.md`.
 */
export const FIELD_RULES_CATALOG: readonly FieldRuleRow[] = [
  {
    dictionaryKey: 'units',
    dictionaryLabel: 'Единицы измерения',
    fieldKey: 'code',
    fieldLabel: 'Код (краткое обозначение)',
    ruleSummary:
      'Обрезка пробелов по краям; для сравнения и импорта — верхний регистр (как договорено для кодов).',
    excelHint: 'Колонка с кодом единицы; дубликаты после нормализации запрещены.',
    exampleBefore: '  kg ',
    exampleAfter: 'KG',
  },
  {
    dictionaryKey: 'units',
    dictionaryLabel: 'Единицы измерения',
    fieldKey: 'name',
    fieldLabel: 'Название',
    ruleSummary: 'Обрезка пробелов; наименование хранится в том виде, как принято в справочнике.',
    excelHint: 'Текст из ячейки ищется с учётом правил справочника (без лишних пробелов).',
    exampleBefore: ' Килограмм ',
    exampleAfter: 'Килограмм',
  },
  {
    dictionaryKey: 'colors',
    dictionaryLabel: 'Цвета (RAL)',
    fieldKey: 'ralCode',
    fieldLabel: 'Код RAL',
    ruleSummary: 'Формат и нормализация по правилам карточки цвета (префикс RAL, пробелы).',
    excelHint: 'В шаблоне материалов/характеристик — как в справочнике цветов.',
    exampleBefore: 'ral7016',
    exampleAfter: 'RAL 7016',
  },
  {
    dictionaryKey: 'material_characteristics',
    dictionaryLabel: 'Характеристики материала',
    fieldKey: 'name',
    fieldLabel: 'Название профиля',
    ruleSummary: 'Обрезка пробелов; уникальность и сопоставление при импорте — по правилам аудита справочника.',
    excelHint: 'Текстовая колонка для ссылки при импорте материалов (без id в файле).',
  },
  {
    dictionaryKey: 'materials',
    dictionaryLabel: 'Материалы (целевая модель)',
    fieldKey: 'materialCharacteristicId + снимки',
    fieldLabel: 'Связь и денорм-подписи',
    ruleSummary:
      'Храним id выбранной характеристики и копии отображаемых полей на момент сохранения (см. доменный документ).',
    excelHint: 'В файле — человекочитаемые колонки; при импорте разрешение в строки мелких справочников.',
  },
];
