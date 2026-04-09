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

/**
 * Один перехватчик на все `/api/*` (включая `http://127.0.0.1:3000/api/...` из dev `API_CONFIG`),
 * без `route.fallback()` — иначе моки для «второго» хоста могут не сработать.
 */
async function mockAuthAndOfferStatusFlowApi(
  page: Parameters<typeof test>[0]['page'],
  role: RoleCode,
): Promise<void> {
  const user = {
    id: `user-${role}`,
    login: `${role}@local.dev`,
    password: '',
    fullName: `${roleNameByCode[role]} Local`,
    email: `${role}@local.dev`,
    phone: '+70000000000',
    roleId: roleIdByCode[role],
  };

  const offerId = 'offer-smoke-1';
  const nowIso = '2026-04-12T12:00:00.000Z';
  let currentStatusKey: 'proposal_draft' | 'proposal_waiting' | 'proposal_paid' = 'proposal_draft';
  const orders: Array<{
    id: string;
    commercialOfferId: string;
    orderNumber: string;
    offerNumber: string;
    customerLabel: string;
    deadline: string | null;
    notes: string;
    linesSnapshot: Array<{ lineNo: number; name: string; description: string | null; qty: number; unit: string; sortOrder: number }>;
    createdAt: string;
    updatedAt: string;
  }> = [];

  await page.route(
    (u) => u.pathname.includes('/api/'),
    async (route) => {
      const req = route.request();
      const method = req.method();
      const urlStr = req.url();

      if (method === 'POST' && urlStr.includes('/api/auth/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: `mock-jwt-${role}`,
            user,
          }),
        });
        return;
      }

      if (method === 'GET' && urlStr.includes('/api/auth/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user }),
        });
        return;
      }

      if (method === 'GET' && urlStr.includes('/api/roles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'role-sys-admin', code: 'admin', name: 'Администратор', isSystem: true, isActive: true },
          ]),
        });
        return;
      }

      if (urlStr.includes('/api/authz-matrix')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ matrix: null }),
        });
        return;
      }

      if (method === 'GET' && urlStr.includes('/api/commercial-offers')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: offerId,
              number: 'КП-000777',
              title: 'Smoke КП',
              currentStatusKey,
              organizationLabel: 'ООО Smoke',
              clientLabel: null,
              recipient: 'ООО Smoke',
              totalAmount: 1000,
              updatedAt: nowIso,
            },
          ]),
        });
        return;
      }

      if (method === 'POST' && urlStr.includes(`/api/commercial-offers/${offerId}/status`)) {
        const body = req.postDataJSON() as { statusKey?: string };
        const next = body?.statusKey;
        if (next === 'proposal_waiting' || next === 'proposal_paid' || next === 'proposal_draft') {
          currentStatusKey = next;
        }
        if (currentStatusKey === 'proposal_paid' && orders.length === 0) {
          orders.push({
            id: 'order-smoke-1',
            commercialOfferId: offerId,
            orderNumber: 'КП-000777',
            offerNumber: 'КП-000777',
            customerLabel: 'ООО Smoke',
            deadline: null,
            notes: '',
            linesSnapshot: [{ lineNo: 1, name: 'Позиция', description: null, qty: 1, unit: 'шт', sortOrder: 0 }],
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      if (method === 'GET' && urlStr.includes('/api/orders')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(orders),
        });
        return;
      }

      if (method === 'GET' && urlStr.includes('/api/health')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    },
  );
}

test.describe('srm-front smoke', () => {
  test('login navigates to dictionaries hub', async ({ page }) => {
    test.setTimeout(60_000);
    await mockAuthApi(page, 'admin');

    await page.goto('/');
    await page.locator('input[name="username"]').fill('admin@local.dev');
    await page.locator('input[name="password"]').fill('admin123');
    await page.getByRole('button', { name: 'Войти в систему' }).click();

    await expect(page).toHaveURL(/\/(%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D1%87%D0%BD%D0%B8%D0%BA%D0%B8|справочники)$/);
    await expect(page.locator('.dictionaryHub')).toBeVisible({ timeout: 30_000 });
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

  test('commercial offer status flow creates order entry', async ({ page }) => {
    test.setTimeout(120_000);
    await mockAuthAndOfferStatusFlowApi(page, 'admin');

    await page.goto('/');
    await page.locator('input[name="username"]').fill('admin@local.dev');
    await page.locator('input[name="password"]').fill('admin123');
    await page.getByRole('button', { name: 'Войти в систему' }).click();
    await expect(page).toHaveURL(/\/(%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D1%87%D0%BD%D0%B8%D0%BA%D0%B8|справочники)$/);

    await expect(page.locator('.dictionaryHub')).toBeVisible({ timeout: 30_000 });

    const hubBase = page.url().split('?')[0];
    await page.goto(`${hubBase}?hub=commercialOffers`);
    const statusSelect = page.locator('.dictionaryCommercialOfferStatusSelect').first();
    await expect(statusSelect).toBeVisible({ timeout: 20_000 });
    await statusSelect.selectOption('proposal_waiting');
    await statusSelect.selectOption('proposal_paid');

    await page.goto(`${hubBase}?hub=orders`);
    await expect(page.locator('.dictionaryHubDetailCard').getByText('КП-000777').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
