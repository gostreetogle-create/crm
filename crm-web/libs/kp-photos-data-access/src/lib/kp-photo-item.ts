export type KpPhotoItem = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  photoTitle: string;
  /** Имя файла в каталоге на сервере (организация/{photoFileName}). */
  photoFileName: string;
  /** Разрешённый URL для превью (файл на диске или legacy URL). */
  photoUrl: string;
  /** Сохранённый внешний или data URL — для поля в форме; может отличаться от photoUrl при приоритете файла на диске. */
  photoExternalUrl: string;
  isActive: boolean;
};

export type KpPhotoItemInput = {
  name: string;
  organizationId: string;
  photoTitle: string;
  photoFileName: string;
  /** Внешний или data URL; в HTTP body уходит как `photoUrl`. */
  photoUrl: string;
  isActive: boolean;
};
