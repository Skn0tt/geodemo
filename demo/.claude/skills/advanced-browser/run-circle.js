export async function runCircle(page, { center, radius, duration, steps }) {
    await page.clock.install();
    await page.context().grantPermissions(['geolocation']);

    for (let step = 0; step <= steps; step++) {
        const angle = (step / steps) * 2 * Math.PI;
        const latitude = center.latitude + (radius / 111320) * Math.cos(angle); // approx conversion
        const longitude = center.longitude + (radius / (111320 * Math.cos(center.latitude * (Math.PI / 180)))) * Math.sin(angle);

        await page.context().setGeolocation({ latitude, longitude });
        await page.clock.fastForward(duration / steps);
    }
}