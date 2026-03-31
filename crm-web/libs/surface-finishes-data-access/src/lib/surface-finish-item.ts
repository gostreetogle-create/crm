export type SurfaceFinishItem = {
  id: string;
  finishType: string;
  roughnessClass: string;
  raMicron?: number;
};

export type SurfaceFinishItemInput = Omit<SurfaceFinishItem, 'id'>;
