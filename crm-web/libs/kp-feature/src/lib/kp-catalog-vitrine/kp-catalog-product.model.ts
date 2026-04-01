/** Модель строки каталога для витрины КП; при подключении API замените источник данных, поля можно расширить. */
export type KpCatalogProduct = {
  id: string;
  category: string;
  title: string;
  sku: string;
  /** Цена в рублях (число). */
  price: number;
  /** Сид для стабильного URL картинки (picsum). */
  imageSeed: string;
};
