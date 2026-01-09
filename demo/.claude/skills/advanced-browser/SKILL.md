---
name: advanced-browser
description: Advanced techniques around browser_ tools. Use this for geolocation mocking, clock mocking, network manipulation and API testing.
---

Through `browser_run_code`, you can use the full Playwright API to perform advanced browser interactions.

# Geolocation

```javascript
async (page) => {
  await page.context().grantPermissions(['geolocation']); // always grant permission first
  await page.context().setGeolocation({
    latitude: 52.5234,
    longitude: 13.4014,
    accuracy: 100 // optional. number in meters. usually not needed
  });
}
```

# Clock Mocking

Use Playwright's clock API to control time in tests:

```javascript
async (page) => {
  await page.clock.install({ time: new Date('2024-01-01T10:00:00') });
  await page.clock.install(); // installs clock at current time
  await page.clock.fastForward("05:00"); // advance 5 minutes
}
```

If you need to simulate time passing, always use this over "waitForTimeout".

# Example: Simulating Perfect Circle Movement

```javascript
async (page) => {
  const { runCircle } = await import('./run-circle.js'); // helper to generate circle points
  await runCircle(page, {
    center: { latitude: 52.5234, longitude: 13.4014 },
    radius: 50, // in meters
    steps: 30,
    duration: 15 * 60 * 1000,
  });
}
```

# Example: Simulating Movement

```javascript
async (page) => {
  await page.clock.install();
  await page.context().grantPermissions(['geolocation']);

  const points = [
    { latitude: 52.5234, longitude: 13.4014, duration: "02:00" }, // 2 minutes
    { latitude: 52.5225, longitude: 13.4040, duration: "01:00" },
    { latitude: 52.5219, longitude: 13.4070, duration: "04:00" },
    { latitude: 52.5215, longitude: 13.4100, duration: "05:00" },
    { latitude: 52.5219, longitude: 13.4132, duration: "01:00" }
  ];
  for (const point of points) {
    await page.context().setGeolocation(point);
    await page.clock.fastForward(point.duration);
  }
}
```

# Network Manipulation
You can intercept and modify network requests and responses:

```javascript
async (page) => {
  await page.route('**/api/data', async route => {
    const modifiedResponse = {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: 'mocked data' })
    };
    await route.fulfill(modifiedResponse);
  });
}
```

```javascript
async (page) => {
  await page.route('**/api/data', async route => {
    if (/* condition */)
      await route.continue(); // let the request proceed
    else
      await route.abort(); // block the request
  });
}
```

# API Testing

You can use Playwright to test APIs directly, using the browser's authenticated context:

```javascript
async (page) => {
  const response = await page.request.get('https://example.com/api/endpoint');
  const data = await response.json();
  return data;
}
```
