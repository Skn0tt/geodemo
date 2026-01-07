import { test, expect } from '@playwright/test';

test('center on location', async ({ page }) => {
  await page.goto('/');
  // berlin alexanderplatz
  await page.context().setGeolocation({ latitude: 52.521918, longitude: 13.413215 });
  await page.context().grantPermissions(['geolocation']);
  await page.getByRole('button', { name: 'Re-center on my location' }).click();
});

test('run from Alexanderplatz to Hackescher Markt', async ({ page }) => {
  // Install fake timers before navigating
  await page.clock.install();

  await page.goto('/');

  // Grant geolocation permissions
  await page.context().grantPermissions(['geolocation']);

  // Start at Alexanderplatz
  await page.context().setGeolocation({ latitude: 52.521918, longitude: 13.413215 });

  // Start the run
  await page.getByRole('button', { name: 'Start run' }).click();

  // Simulate waypoints along the route from Alexanderplatz to Hackescher Markt
  // Each waypoint has a duration (in seconds) representing time to reach the next point
  const waypoints = [
    { latitude: 52.521918, longitude: 13.413215, duration: 1 },   // Alexanderplatz (start)
    { latitude: 52.522500, longitude: 13.411000, duration: 45 },  // Moving west
    { latitude: 52.523000, longitude: 13.408500, duration: 50 },  // Continue west
    { latitude: 52.523200, longitude: 13.405000, duration: 70 },  // Approaching S-Bahn tracks
    { latitude: 52.523000, longitude: 13.402500, duration: 55 },  // Near Hackescher Markt
    { latitude: 52.522605, longitude: 13.402360, duration: 30 },  // Hackescher Markt (finish)
  ];

  // Move through each waypoint
  for (const { latitude, longitude, duration } of waypoints) {
    await page.context().setGeolocation({ latitude, longitude });
    // Advance time to simulate the leg duration
    await page.clock.fastForward(duration * 1000);
  }

  // Verify duration shows non-zero value before finishing
  await expect(page.getByLabel('Duration')).not.toHaveText('00:00:00');
  
  // Verify distance is displayed (should be around 0.49 mi based on the route)
  await expect(page.getByLabel('Distance')).toHaveText(/\d+(\.\d+)?\s*(mi|ft)/);
  await expect(page.getByLabel('Distance')).not.toHaveText('0 ft');

  // Finish the run
  await Promise.all([
    page.waitForEvent('dialog').then(dialog => dialog.accept()),
    page.getByRole('button', { name: 'Finish run' }).click(),
  ]);

  // Verify the run was saved by checking history
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('listitem', { name: /Run on/ })).toContainText(/\d+(\.\d+)?\s*mi/); // Distance
  await expect(page.getByRole('listitem', { name: /Run on/ })).toContainText(/\d{2}:\d{2}:\d{2}/); // Duration format
});
