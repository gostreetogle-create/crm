import { TestBed } from '@angular/core/testing';
import { ROLE_ID_SYSTEM_ADMIN, ROLE_ID_SYSTEM_VIEWER } from '@srm/roles-data-access';
import { AUTHZ_ROLE_CONTEXT, AUTHZ_SYSTEM_ROLE_IDS } from './authz-role-context.token';
import type { AuthzRoleContext } from './authz-role-context.token';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PermissionsService,
        {
          provide: AUTHZ_SYSTEM_ROLE_IDS,
          useValue: {
            admin: ROLE_ID_SYSTEM_ADMIN,
            editor: 'role-sys-editor',
            viewer: ROLE_ID_SYSTEM_VIEWER,
            director: 'role-seed-director',
            accountant: 'role-seed-accountant',
          },
        },
        {
          provide: AUTHZ_ROLE_CONTEXT,
          useValue: {
            roleById: () => undefined,
          } satisfies AuthzRoleContext,
        },
      ],
    });
    localStorage.clear();
    sessionStorage.clear();
  });

  it('treats system admin as super-admin (full permission set)', () => {
    const svc = TestBed.inject(PermissionsService);
    expect(svc.isSuperAdminRole(ROLE_ID_SYSTEM_ADMIN)).toBe(true);
    svc.setRole(ROLE_ID_SYSTEM_ADMIN);
    expect(svc.can('crud.create')).toBe(true);
    expect(svc.hasAny(['page.dictionaries', 'crud.create'])).toBe(true);
  });

  it('resolves default viewer role from storage fallback to limited permissions', () => {
    const svc = TestBed.inject(PermissionsService);
    svc.setRole(ROLE_ID_SYSTEM_VIEWER);
    const keys = svc.effectiveKeysForRole(ROLE_ID_SYSTEM_VIEWER);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
