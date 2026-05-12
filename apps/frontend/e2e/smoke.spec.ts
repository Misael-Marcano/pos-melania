import { test, expect } from '@playwright/test';

test.beforeAll(async ({ request }) => {
  try {
    await request.get('/login', { timeout: 10_000, failOnStatusCode: false });
  } catch {
    test.skip(
      true,
      'No se pudo conectar al frontend (baseURL de Playwright). Arrancá `npm run dev` en apps/frontend o definí PLAYWRIGHT_BASE_URL si Next.js usó otro puerto (p. ej. http://127.0.0.1:3001 cuando 3000 está ocupado).',
    );
  }
});

test.describe('smoke — shell', () => {
  test('login page has main landmark', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('main')).toBeVisible();
  });
});

/**
 * Smoke: login con usuario seed y llegar al panel o selector de org (rol plataforma).
 * Omitido si faltan E2E_EMAIL / E2E_PASSWORD.
 */
test.describe('smoke — autenticación', () => {
  test('login y redirección a /panel o /select-organizacion', async ({ page }) => {
    const email = process.env.E2E_EMAIL?.trim();
    const password = process.env.E2E_PASSWORD?.trim();
    test.skip(!email || !password, 'Defina E2E_EMAIL y E2E_PASSWORD (ver e2e/README.md)');

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Bienvenido de vuelta/i })).toBeVisible();

    await page.getByLabel('Correo electrónico').fill(email!);
    await page.getByLabel('Contraseña').fill(password!);
    await page.getByRole('button', { name: /Ingresar al sistema/i }).click();

    await expect(page).toHaveURL(/\/panel|\/select-organizacion/, { timeout: 25_000 });
    // Panel usa <main> en el layout; selector de org no — misma copia estable en esa ruta.
    await expect(
      page.getByRole('main').or(page.getByText(/Elegí en qué organización operar/i)),
    ).toBeVisible({ timeout: 25_000 });
  });
});
