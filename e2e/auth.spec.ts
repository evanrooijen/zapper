import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { Pool } from 'pg'

async function logIn(page: Page, email: string, password: string) {
  await page.getByTestId('auth-email').fill(email)
  await page.getByTestId('auth-password').fill(password)
  await page.getByTestId('auth-submit').click()
}

async function logOut(page: Page) {
  await page.getByTestId('logout-button').click()
  await expect(page.getByTestId('login-link')).toBeVisible()
}

test('register, persist a session, log out, log in, and change password', async ({ page }) => {
  const email = `playwright-${randomUUID()}@example.com`
  const password = 'Original-password-123!'
  const newPassword = 'Updated-password-456!'
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    await page.goto('/settings')
    await expect(page.getByTestId('settings-login-required')).toBeVisible()
    await expect(page.getByTestId('password-currentPassword')).toHaveCount(0)

    await page.goto('/')
    await page.getByTestId('register-link').click()
    await page.getByTestId('auth-name').fill('Playwright User')
    await page.getByTestId('auth-email').fill(email)
    await page.getByTestId('auth-password').fill(password)
    await page.getByTestId('auth-submit').click()
    await expect(page.getByTestId('home-heading')).toHaveText('Welcome, Playwright User')
    await expect(page.getByTestId('home-session')).toHaveText(`You’re logged in as ${email}.`)

    await page.reload()
    await expect(page.getByTestId('home-heading')).toHaveText('Welcome, Playwright User')
    await logOut(page)
    await page.getByTestId('login-link').click()

    await logIn(page, email, 'Wrong-password-123!')
    await expect(page.getByTestId('auth-error')).toContainText(/invalid email or password/i)
    await expect(page).toHaveURL('/login')

    await logIn(page, email, password)
    await expect(page.getByTestId('home-heading')).toHaveText('Welcome, Playwright User')
    await page.getByTestId('settings-link').click()

    await page.getByTestId('password-currentPassword').fill('Wrong-password-123!')
    await page.getByTestId('password-newPassword').fill(newPassword)
    await page.getByTestId('password-confirmPassword').fill(newPassword)
    await page.getByTestId('password-submit').click()
    await expect(page.getByTestId('password-error')).toContainText(/invalid password/i)
    await expect(page.getByTestId('password-success')).toHaveCount(0)

    await page.getByTestId('password-currentPassword').fill(password)
    await page.getByTestId('password-submit').click()
    await expect(page.getByTestId('password-success')).toHaveText('Password updated.')
    await expect(page.getByTestId('password-currentPassword')).toHaveValue('')
    await expect(page.getByTestId('password-newPassword')).toHaveValue('')
    await expect(page.getByTestId('password-confirmPassword')).toHaveValue('')

    await page.getByTestId('home-link').click()
    await logOut(page)
    await page.getByTestId('login-link').click()
    await logIn(page, email, password)
    await expect(page.getByTestId('auth-error')).toContainText(/invalid email or password/i)
    await expect(page).toHaveURL('/login')

    await logIn(page, email, newPassword)
    await expect(page.getByTestId('home-heading')).toHaveText('Welcome, Playwright User')
    await logOut(page)
  } finally {
    try {
      await pool.query('DELETE FROM "user" WHERE email = $1', [email])
    } finally {
      await pool.end()
    }
  }
})
