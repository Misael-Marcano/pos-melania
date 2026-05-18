import { test, expect } from '@playwright/test';

test.describe('panel — dashboard tenant', () => {
  test('admin ve panel con encabezado y tarjetas', async ({ page }) => {
    const email = process.env.E2E_EMAIL?.trim();
    const password = process.env.E2E_PASSWORD?.trim();
    test.skip(!email || !password, 'Defina E2E_EMAIL y E2E_PASSWORD (ver e2e/README.md)');

    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(email!);
    await page.getByLabel('Contraseña').fill(password!);
    await page.getByRole('button', { name: /Ingresar al sistema/i }).click();

    await expect(page).toHaveURL(/\/panel|\/select-organizacion/, { timeout: 25_000 });
    if (page.url().includes('select-organizacion')) {
      await page.getByRole('button').first().click();
      await expect(page).toHaveURL(/\/panel/, { timeout: 15_000 });
    }

    await expect(page.locator('#panel-heading')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Stock bajo/i).first()).toBeVisible();
  });
});
