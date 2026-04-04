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
  /** Как поле задаётся в JSON/API и как сопоставляется при массовом импорте. */
  bulkHint: string;
  exampleBefore?: string;
  exampleAfter?: string;
};
