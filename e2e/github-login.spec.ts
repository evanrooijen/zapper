import { expect, test } from '@playwright/test'

test.skip(
  !process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET,
  'GitHub is not configured',
)

test('GitHub login redirects without requiring email or password', async ({ page }) => {
  await page.route('**/api/auth/sign-in/social', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      provider: 'github',
      callbackURL: '/',
      errorCallbackURL: '/login',
    })
    await route.fulfill({
      json: { url: 'https://github.com/login/oauth/authorize?client_id=test', redirect: true },
    })
  })
  await page.route('https://github.com/**', (route) =>
    route.fulfill({ body: 'GitHub authorization' }),
  )
  await page.goto('/')
  await page.getByTestId('login-link').click()
  await page.getByRole('button', { name: 'Log in with GitHub' }).click()
  await expect(page).toHaveURL(/https:\/\/github.com\/login\/oauth\/authorize/)
})

test('GitHub login shows failures and allows retry', async ({ page }) => {
  await page.route('**/api/auth/sign-in/social', (route) =>
    route.fulfill({ status: 400, json: { code: 'PROVIDER_NOT_FOUND', message: 'Unavailable' } }),
  )
  await page.goto('/')
  await page.getByTestId('login-link').click()
  const button = page.getByRole('button', { name: 'Log in with GitHub' })
  await button.click()
  await expect(page.getByTestId('auth-error')).toContainText('Unable to log in with GitHub')
  await expect(button).toBeEnabled()
  await page.route('**/api/auth/sign-in/social', (route) => route.abort())
  await button.click()
  await expect(page.getByTestId('auth-error')).toContainText('Unable to connect')
  await expect(button).toBeEnabled()
})

test('OAuth callback errors explain that linking is required', async ({ page }) => {
  await page.goto('/login?error=account_not_linked')
  await expect(page.getByTestId('auth-error')).toContainText('link GitHub in Settings')
  await expect(page.getByRole('button', { name: 'Log in with GitHub' })).toBeEnabled()
})
