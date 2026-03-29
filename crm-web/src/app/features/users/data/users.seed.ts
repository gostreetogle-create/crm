import { ROLE_ID_SYSTEM_ADMIN } from '../../roles/data/roles.seed';
import { UserItem } from '../model/user-item';

export const USER_ID_SEED_DEMO = 'user-seed-demo';

/** Начальные пользователи; пароль в открытом виде — только mock. */
export const USERS_SEED: readonly UserItem[] = [
  {
    id: USER_ID_SEED_DEMO,
    login: 'demo',
    password: 'demo',
    fullName: 'Демо пользователь',
    email: 'demo@example.local',
    phone: '',
    roleId: ROLE_ID_SYSTEM_ADMIN,
  },
];
