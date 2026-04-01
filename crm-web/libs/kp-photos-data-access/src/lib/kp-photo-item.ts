export type KpPhotoItem = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  photoTitle: string;
  photoUrl: string;
  isActive: boolean;
};

export type KpPhotoItemInput = Omit<KpPhotoItem, 'id' | 'organizationName'>;
