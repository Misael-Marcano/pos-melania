import { test, expect, type Page } from '@playwright/test';

function plataformaCredentials() {
  const email =
    process.env.E2E_PLATAFORMA_EMAIL?.trim() ||
    process.env.E2E_EMAIL?.trim();
  const password =
    process.env.E2E_PLATAFORMA_PASSWORD?.trim() ||
    process.env.E2E_PASSWORD?.trim();
  return { email, password };
}

async function loginPlataforma(page: Page) {
  const { email, password } = plataformaCredentials();
  if (!email || !password) {
    return false;
  }

  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /Ingresar al sistema/i }).click();
  await expect(page).toHaveURL(/\/select-organizacion|\/panel/, { timeout: 25_000 });
  return true;
}

test.describe('plataforma — panel multi-org', () => {
  test('usuario plataforma ve /plataforma con KPIs y tabla', async ({ page }) => {
    const { email, password } = plataformaCredentials();
    test.skip(!email || !password, 'Defina E2E_PLATAFORMA_EMAIL/PASSWORD o E2E_EMAIL/PASSWORD (ver e2e/README.md)');

    const ok = await loginPlataforma(page);
    test.skip(!ok, 'Login plataforma falló');

    await page.goto('/plataforma');
    await expect(page).toHaveURL(/\/plataforma/, { timeout: 15_000 });
    await expect(page.locator('h2', { hasText: 'Panel de organizaciones' })).toBeVisible();
    await expect(page.getByText('Mostrando').first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByPlaceholder(/Buscar por nombre o slug/i)).toBeVisible();
  });

  test('filtro de búsqueda reduce filas visibles', async ({ page }) => {
    const { email, password } = plataformaCredentials();
    test.skip(!email || !password, 'Defina credenciales E2E plataforma');

    const ok = await loginPlataforma(page);
    test.skip(!ok, 'Login plataforma falló');

    await page.goto('/plataforma');
    await expect(page.getByText('Mostrando').first()).toBeVisible({ timeout: 25_000 });

    const search = page.getByPlaceholder(/Buscar por nombre o slug/i);
    await expect(search).toBeEnabled();
    await search.fill('zzzz-no-existe-tenant-xyz');
    await expect(
      page.locator('table').getByText(/Ninguna organización coincide con los filtros/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Operar abre dashboard del tenant en /panel', async ({ page }) => {
    const { email, password } = plataformaCredentials();
    test.skip(!email || !password, 'Defina credenciales E2E plataforma');

    const ok = await loginPlataforma(page);
    test.skip(!ok, 'Login plataforma falló');

    await page.goto('/plataforma');
    await expect(page.getByText('Mostrando').first()).toBeVisible({ timeout: 25_000 });

    const operar = page.getByRole('button', { name: /Operar en/i }).first();
    await expect(operar).toBeVisible({ timeout: 10_000 });

    await operar.click();
    await expect(page).toHaveURL(/\/panel/, { timeout: 15_000 });
    await expect(page.locator('#panel-heading')).toBeVisible({ timeout: 15_000 });
  });
});
