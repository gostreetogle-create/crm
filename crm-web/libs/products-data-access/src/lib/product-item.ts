/** Строка состава изделия (ответ API). */
export type ProductLineDto = {
  id: string;
  sortOrder: number;
  productionDetailId: string;
  workTypeId: string | null;
  colorId: string | null;
  productionDetail: {
    id: string;
    name: string;
    lineTotalRub: number | null;
    sourceWorkTypeId: string | null;
    sourceMaterialId: string | null;
  };
  overrideWorkType: { id: string; name: string; shortLabel: string } | null;
  overrideColor: { id: string; name: string; ralCode: string | null; hex: string } | null;
};

export type ProductItem = {
  id: string;
  name: string;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lines: ProductLineDto[];
};

/** Строка состава в ответе списка изделий (для раскрытия строки таблицы). */
export type ProductCompositionLineListItem = {
  detailName: string;
  workTypeLabel: string;
  colorLabel: string;
};

/** Элемент списка изделий: сводки по строкам состава для таблицы хаба. */
export type ProductListItem = {
  id: string;
  name: string;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  linesCount: number;
  /** Наименования деталей по строкам, через «; ». */
  detailNamesSummary: string;
  /** Эффективные виды работ по строкам (переопределение или из детали), через «; ». */
  workTypesSummary: string;
  /** Сводный цвет изделия (по строкам состава, без дублей). */
  colorLabel: string;
  /** Порядок строк состава — деталь, вид работ, цвет (для раскрывающейся таблицы). */
  compositionLines: ProductCompositionLineListItem[];
  createdAt: string;
  updatedAt: string;
};

export type ProductLineInput = {
  id?: string | null;
  sortOrder?: number;
  productionDetailId: string;
  workTypeId?: string | null;
  colorId?: string | null;
};

export type ProductItemInput = {
  name: string;
  priceRub: number | null;
  costRub: number | null;
  notes: string | null;
  isActive: boolean;
  lines: ProductLineInput[];
};
