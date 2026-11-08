import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { Pool } from 'pg'

async function post(page: Page, data: object) {
  return page.request.post('/api/favorites', {
    data,
    headers: { origin: new URL(page.url()).origin },
  })
}

test('owner maintains, publishes, and revokes a favorites list', async ({ page, browser }) => {
  const email = `favorites-${randomUUID()}@example.com`
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await page.goto('/')
    await page.getByTestId('register-link').click()
    await page.getByTestId('auth-name').fill('Favorites Owner')
    await page.getByTestId('auth-email').fill(email)
    await page.getByTestId('auth-password').fill('Favorites-password-123!')
    await page.getByTestId('auth-submit').click()
    await page.getByRole('link', { name: 'My favorites' }).click()
    await expect(page.getByText('Your list is private.')).toBeVisible()
    await page.getByLabel('IMDb ID or title URL').fill('tt11280740')
    await page.getByRole('button', { name: 'Add show' }).click()
    await expect(page.getByRole('link', { name: 'tt11280740', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('link', { name: 'tt11280740', exact: true })).toBeVisible()
    await page
      .getByLabel('IMDb ID or title URL')
      .fill('https://www.imdb.com/title/tt11280740/?ref_=test')
    await page.getByRole('button', { name: 'Add show' }).click()
    await expect(page.getByRole('status')).toHaveText('Already a favorite.')
    await page.getByRole('button', { name: 'Remove tt11280740' }).click()
    await expect(page.getByText('No favorites yet.')).toBeVisible()

    for (const input of ['tt11280740', 'https://www.imdb.com/title/tt7366338/']) {
      expect((await post(page, { action: 'add', input })).ok()).toBe(true)
    }
    const concurrent = await Promise.all([
      post(page, { action: 'add', input: 'tt0944947' }),
      post(page, { action: 'add', input: 'tt0944947' }),
    ])
    expect(
      (await Promise.all(concurrent.map((response) => response.json())))
        .map((data) => data.message)
        .sort(),
    ).toEqual(['Already a favorite.', 'Favorite added.'])
    await page.reload()
    await expect(page.locator('li a')).toHaveText(['tt0944947', 'tt7366338', 'tt11280740'])
    const original = await (await page.request.get('/api/favorites')).json()
    const visitor = await browser.newContext()
    const visitorPage = await visitor.newPage()
    try {
      const privateResponse = await visitor.request.get(`/api/lists/${original.id}`)
      const missingResponse = await visitor.request.get('/api/lists/nonexistent')
      expect(privateResponse.status()).toBe(missingResponse.status())
      expect(await privateResponse.json()).toEqual(await missingResponse.json())
      expect((await visitor.request.get('/api/favorites')).status()).toBe(401)
      expect(
        (
          await visitor.request.post('/api/favorites', {
            headers: { origin: new URL(page.url()).origin },
            data: { action: 'remove', imdbId: 'tt11280740' },
          })
        ).status(),
      ).toBe(401)
      const crossOrigin = await page.request.post('/api/favorites', {
        headers: { origin: 'https://example.com' },
        data: { action: 'remove', imdbId: 'tt11280740' },
      })
      expect(crossOrigin.status()).toBe(403)

      await page.getByRole('button', { name: 'Make public' }).click()
      await expect(page.getByText('Your list is public.')).toBeVisible()
      const published = await (await page.request.get('/api/favorites')).json()
      for (const [input, message] of [
        ['invalid', 'Enter a valid IMDb ID or title URL.'],
        ['https://example.com/title/tt11280740/', 'Enter a valid IMDb ID or title URL.'],
        ['https://www.imdb.com/title/tt11280740/episodes', 'Enter a valid IMDb ID or title URL.'],
        ['tt0000001', 'Show not found.'],
        ['tt0000003', 'Only TV series and miniseries can be added.'],
        ['tt0000004', 'Only TV series and miniseries can be added.'],
        ...['tt0000002', 'tt0000005', 'tt0000006', 'tt0000007', 'tt0000008'].map((id) => [
          id,
          'Unable to validate this show. Please try again.',
        ]),
      ]) {
        const response = await post(page, { action: 'add', input })
        expect(response.ok(), input).toBe(false)
        expect(await response.json()).toEqual({ message })
        expect(await (await page.request.get('/api/favorites')).json()).toEqual(published)
      }
      await page.getByLabel('IMDb ID or title URL').fill('tt0000002')
      await page.getByRole('button', { name: 'Add show' }).click()
      await expect(page.getByRole('alert')).toHaveText(
        'Unable to validate this show. Please try again.',
      )
      await expect(page.locator('li a')).toHaveText(['tt0944947', 'tt7366338', 'tt11280740'])
      await expect(page.getByText('Your list is public.')).toBeVisible()
      const sharingPath = await page
        .getByRole('link', { name: 'Open sharing link' })
        .getAttribute('href')
      expect(sharingPath).toBe(`/lists/${original.id}`)
      await visitorPage.goto(sharingPath!)
      await expect(visitorPage.locator('li a')).toHaveText(['tt0944947', 'tt7366338', 'tt11280740'])
      await expect(visitorPage.getByRole('button', { name: /Remove|Make private/ })).toHaveCount(0)
      const publicResponse = await visitor.request.get(`/api/lists/${original.id}`)
      expect(publicResponse.headers()['cache-control']).toContain('no-store')
      expect(await publicResponse.json()).toEqual({
        entries: [{ imdbId: 'tt0944947' }, { imdbId: 'tt7366338' }, { imdbId: 'tt11280740' }],
      })
      await expect(visitorPage.locator('body')).not.toContainText(email)
      await expect(visitorPage.locator('body')).not.toContainText('Favorites Owner')

      const otherEmail = `other-${randomUUID()}@example.com`
      try {
        expect(
          (
            await visitor.request.post('/api/auth/sign-up/email', {
              data: { name: 'Other User', email: otherEmail, password: 'Other-password-123!' },
              headers: { origin: new URL(page.url()).origin },
            })
          ).ok(),
        ).toBe(true)
        expect(
          (
            await visitor.request.post('/api/favorites', {
              headers: { origin: new URL(page.url()).origin },
              data: { action: 'visibility', isPublic: false, listId: original.id },
            })
          ).status(),
        ).toBe(400)
        await visitor.request.post('/api/favorites', {
          headers: { origin: new URL(page.url()).origin },
          data: { action: 'remove', imdbId: 'tt11280740' },
        })
        expect((await (await page.request.get('/api/favorites')).json()).entries).toHaveLength(3)
        expect(
          (
            await visitor.request.post(`/api/lists/${original.id}`, {
              data: { action: 'remove', imdbId: 'tt11280740' },
            })
          ).ok(),
        ).toBe(false)
      } finally {
        await pool.query('DELETE FROM "user" WHERE email = $1', [otherEmail])
      }

      await page.getByRole('button', { name: 'Make private' }).click()
      await expect(page.getByText('Your list is private.')).toBeVisible()
      await visitorPage.reload()
      await expect(visitorPage.getByText('List unavailable')).toBeVisible()
      expect((await visitor.request.get(`/api/lists/${original.id}`)).status()).toBe(404)
      await page.reload()
      await expect(page.getByText('Your list is private.')).toBeVisible()
      await page.getByRole('button', { name: 'Make public' }).click()
      await expect(page.getByRole('link', { name: 'Open sharing link' })).toHaveAttribute(
        'href',
        sharingPath!,
      )
      await visitorPage.reload()
      await expect(visitorPage.locator('li a')).toHaveCount(3)
      for (const imdbId of ['tt0944947', 'tt7366338', 'tt11280740'])
        await post(page, { action: 'remove', imdbId })
      await visitorPage.reload()
      await expect(visitorPage.getByText('No favorites yet.')).toBeVisible()
    } finally {
      await visitor.close()
    }
  } finally {
    await pool.query('DELETE FROM "user" WHERE email = $1', [email])
    await pool.end()
  }
})
