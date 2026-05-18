import { test, expect } from '@playwright/test';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const email = process.env.E2E_EMAIL?.trim();
  const password = process.env.E2E_PASSWORD?.trim();
  test.skip(!email || !password, 'Defina E2E_EMAIL y E2E_PASSWORD (ver e2e/README.md)');

  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email!);
  await page.getByLabel('Contraseña').fill(password!);
  await page.getByRole('button', { name: /Ingresar al sistema/i }).click();
  await expect(page).toHaveURL(/\/panel|\/select-organizacion/, { timeout: 25_000 });
}

test.describe('configuración — admin', () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto('/login', { timeout: 10_000 });
    } catch {
      test.skip(true, 'Frontend no disponible (PLAYWRIGHT_BASE_URL / npm run dev).');
    }
    await loginAsAdmin(page);
    await page.goto('/configuracion');
    await expect(page.getByRole('main')).toBeVisible({ timeout: 20_000 });
  });

  test('guardar nombre de empresa muestra confirmación', async ({ page }) => {
    const field = page.getByPlaceholder('Ej: Mi Negocio EIRL');
    await expect(field).toBeVisible();

    const stamp = Date.now();
    const nuevo = `E2E Config ${stamp}`;
    await field.fill(nuevo);
    await page.getByRole('button', { name: /Guardar cambios/i }).click();

    await expect(
      page.getByText(/Configuración guardada/i),
    ).toBeVisible({ timeout: 15_000 });
    await expect(field).toHaveValue(nuevo);
  });
});
