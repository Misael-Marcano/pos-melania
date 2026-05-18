import { test, expect } from '@playwright/test';

function contadorCredentials() {
  const email =
    process.env.E2E_CONTADOR_EMAIL?.trim() ||
    'contador@pos.com';
  const password =
    process.env.E2E_CONTADOR_PASSWORD?.trim() ||
    'Contador123!';
  return { email, password };
}

test.describe('configuración — contador solo lectura', () => {
  test('no puede guardar cambios', async ({ page }) => {
    const { email, password } = contadorCredentials();

    try {
      await page.goto('/login', { timeout: 10_000 });
    } catch {
      test.skip(true, 'Frontend no disponible.');
    }

    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: /Ingresar al sistema/i }).click();
    await expect(page).toHaveURL(/\/reportes|\/select-organizacion/, { timeout: 25_000 });

    await page.goto('/configuracion');
    await expect(page.getByRole('main')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/solo lectura.*contador/i)).toBeVisible();

    await expect(page.getByRole('button', { name: /Guardar cambios/i })).toHaveCount(0);
  });
});
