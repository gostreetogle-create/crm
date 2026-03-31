/** Пользователь CRM (справочник до API). Пароль в mock хранится открытым текстом — только для разработки. */
export type UserItem = {
  id: string;
  login: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  /** Ссылка на `RoleItem.id`. */
  roleId: string;
};

/** Для create/update: пустой `password` при update означает «не менять». */
export type UserItemInput = Omit<UserItem, 'id'>;
