export type CoatingItem = {
  id: string;
  coatingType: string;
  coatingSpec: string;
  thicknessMicron?: number;
};

export type CoatingItemInput = Omit<CoatingItem, 'id'>;
