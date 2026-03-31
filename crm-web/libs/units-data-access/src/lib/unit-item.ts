export type UnitItem = {
  id: string;
  name: string;
  code?: string;
  notes?: string;
  isActive: boolean;
};

export type UnitItemInput = Omit<UnitItem, 'id'>;
