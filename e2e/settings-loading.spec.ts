import { expect, test } from '@playwright/test'

for (const width of [390, 1280]) {
  for (const connected of [false, true]) {
    test(`connected accounts reserves its layout at ${width}px (${connected ? 'linked' : 'unlinked'})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.route('**/api/auth/get-session', (route) =>
        route.fulfill({
          json: {
            session: {
              id: 'test-session',
              userId: 'test-user',
              expiresAt: '2099-01-01T00:00:00.000Z',
            },
            user: {
              id: 'test-user',
              name: 'Test User',
              email: 'test@example.com',
              emailVerified: true,
            },
          },
        }),
      )
      let release!: () => void
      const pending = new Promise<void>((resolve) => {
        release = resolve
      })
      await page.route('**/api/auth/list-accounts', async (route) => {
        await pending
        await route.fulfill({ json: connected ? [{ providerId: 'github' }] : [] })
      })
      await page.goto('/settings')
      const card = page
        .locator('[data-slot="card"]')
        .filter({ has: page.getByRole('heading', { name: 'Connected accounts' }) })
      await expect(card.getByText('Loading connected accounts…')).toBeVisible()
      const before = await card.boundingBox()
      release()
      await expect(card.locator('[data-slot="badge"]')).toHaveText(
        connected ? 'Connected' : 'Not connected',
      )
      const after = await card.boundingBox()
      expect(after?.height).toBe(before?.height)
      expect(after?.y).toBe(before?.y)
    })
  }
}
