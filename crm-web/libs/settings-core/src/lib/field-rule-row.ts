/**
 * Строка витрины «правила полей» для администратора.
 * Данные задаются в `field-rules.catalog.ts` (единый источник для UI до API).
 */
export type FieldRuleRow = {
  /** Ключ справочника в коде (например `units`). */
  dictionaryKey: string;
  /** Заголовок для людей. */
  dictionaryLabel: string;
  /** Ключ поля в модели/API. */
  fieldKey: string;
  fieldLabel: string;
  /** Краткое описание нормализации и хранения. */
  ruleSummary: string;
  /** Что писать в Excel / как сопоставляется при импорте. */
  excelHint: string;
  exampleBefore?: string;
  exampleAfter?: string;
};
