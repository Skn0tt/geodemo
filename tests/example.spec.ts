import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  // berlin alexanderplatz
  await page.context().setGeolocation({ latitude: 52.521918, longitude: 13.413215 });
  await page.context().grantPermissions(['geolocation']);
  await page.getByRole('button', { name: 'Re-center on my location' }).click();
});
