import { eq } from 'drizzle-orm'
import { Pool } from 'pg'
import { expect, test, vi } from 'vitest'

import { account, user } from '../db/schema'

test.skipIf(!process.env.AUTH_TEST_DATABASE_URL)('email/password sessions persist and logout revokes them', async () => {
  vi.stubEnv('DATABASE_URL', process.env.AUTH_TEST_DATABASE_URL!)
  vi.stubEnv('DB_DRIVER', 'postgres')
  vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000')
  vi.stubEnv('BETTER_AUTH_SECRET', 'integration-test-secret-at-least-32-characters')
  const { auth } = await import('./auth')
  const { db } = await import('./db')
  const email = `auth-test-${crypto.randomUUID()}@example.com`
  const password = 'correct-password-123'
  const request = (path: string, body?: object, cookie?: string) => auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }))

  try {
    const signup = await request('sign-up/email', { name: 'Test User', email, password })
    expect(signup.status).toBe(200)
    const created = await db.select().from(user).where(eq(user.email, email))
    expect(created).toHaveLength(1)
    const credentials = await db.select().from(account).where(eq(account.userId, created[0].id))
    expect(credentials[0].password).toBeTruthy()
    expect(credentials[0].password).not.toBe(password)

    expect((await request('sign-in/email', { email, password: 'wrong-password' })).status).toBe(401)
    const login = await request('sign-in/email', { email, password })
    expect(login.status).toBe(200)
    const cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
    expect(cookie).toContain('better-auth.session_token=')
    const session = await request('get-session', undefined, cookie)
    expect((await session.json()).user.email).toBe(email)
    expect((await request('sign-out', {}, cookie)).status).toBe(200)
    expect(await (await request('get-session', undefined, cookie)).json()).toBeNull()
  } finally {
    await db.delete(user).where(eq(user.email, email))
    if (db.$client instanceof Pool) await db.$client.end()
    vi.unstubAllEnvs()
  }
}, 20_000)
