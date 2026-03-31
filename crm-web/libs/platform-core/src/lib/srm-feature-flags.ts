import { InjectionToken } from '@angular/core';

/** true в приложении `srm-front`; в `crm-web` по умолчанию false. */
export const SRM_SHELL_ACTIVE = new InjectionToken<boolean>('SRM_SHELL_ACTIVE', {
  providedIn: 'root',
  factory: () => false,
});
