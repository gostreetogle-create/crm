export type ColorItem = {
  id: string;
  ralCode: string;
  name: string;
  hex: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
};

export type ColorItemInput = Omit<ColorItem, 'id'>;
