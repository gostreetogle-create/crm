export type WarehouseUnit = "шт" | "кг" | "л";
export type ApiStockMovementType = "incoming" | "outgoing" | "adjustment";

export type WarehouseProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: WarehouseUnit;
  minStockLevel: number;
  price: number;
  supplierName: string | null;
  warehouseLocation: string | null;
  createdAt: string;
  updatedAt: string;
  isBelowMinStockLevel: boolean;
};

export type WarehouseProductInput = {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: WarehouseUnit;
  minStockLevel: number;
  price: number;
  supplierName: string | null;
  warehouseLocation: string | null;
};

export type WarehouseMovement = {
  id: string;
  productId: string;
  type: ApiStockMovementType;
  quantity: number;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit: WarehouseUnit;
    category: string;
  };
};

export type WarehouseMovementInput = {
  productId: string;
  type: ApiStockMovementType;
  quantity: number;
  reason: string | null;
};

export type WarehouseSummary = {
  totalProducts: number;
  lowStockCount: number;
  totalValue: number;
};
