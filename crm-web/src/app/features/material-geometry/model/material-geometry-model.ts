import { FieldRow } from '../../../shared/model/field-row';

export type MaterialGeometryModel = {
  version: string;
  materialFields: FieldRow[];
  geometryFields: FieldRow[];
};

