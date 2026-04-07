import { expect, test } from '@playwright/test';

type RoleCode = 'viewer' | 'editor' | 'admin';

const roleIdByCode: Record<RoleCode, string> = {
  viewer: 'role-sys-admin',
  editor: 'role-sys-admin',
  admin: 'role-sys-admin',
};

const roleNameByCode: Record<RoleCode, string> = {
  viewer: 'Viewer',
  editor: 'Editor',
  admin: 'Admin',
};

async function mockAuthApi(page: Parameters<typeof test>[0]['page'], role: RoleCode): Promise<void> {
  const user = {
    id: `user-${role}`,
    login: `${role}@local.dev`,
    password: '',
    fullName: `${roleNameByCode[role]} Local`,
    email: `${role}@local.dev`,
    phone: '+70000000000',
    roleId: roleIdByCode[role],
  };

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: `mock-jwt-${role}`,
        user,
      }),
    });
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user }),
    });
  });

  await page.route('**/api/roles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'role-sys-admin', code: 'admin', name: 'Администратор', isSystem: true, isActive: true },
      ]),
    });
  });

  await page.route('**/api/authz-matrix', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ matrix: null }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ matrix: null }),
    });
  });
}

test.describe('srm-front smoke', () => {
  test('login navigates to dictionaries hub', async ({ page }) => {
    await mockAuthApi(page, 'admin');

    await page.goto('/');
    await page.locator('input[name="username"]').fill('admin@local.dev');
    await page.locator('input[name="password"]').fill('admin123');
    await page.getByRole('button', { name: 'Войти в систему' }).click();

    await expect(page).toHaveURL(/\/(%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D1%87%D0%BD%D0%B8%D0%BA%D0%B8|справочники)$/);
  });

  test('unknown route renders 404 page', async ({ page }) => {
    await page.goto('/definitely-missing-page');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('Страница не найдена.')).toBeVisible();
  });

  test('forbidden route renders 403 page', async ({ page }) => {
    await page.goto('/forbidden');
    await expect(page.getByRole('heading', { name: '403' })).toBeVisible();
    await expect(page.getByText('Доступ запрещён. Обратитесь к администратору.')).toBeVisible();
  });
});
