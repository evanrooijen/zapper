import { eq } from 'drizzle-orm'
import { Pool } from 'pg'
import { expect, test, vi } from 'vitest'

import { account, user } from '../db/schema'

test.skipIf(!process.env.AUTH_TEST_DATABASE_URL)(
  'password changes revoke other sessions and GitHub links to the current user',
  async () => {
    vi.stubEnv('DATABASE_URL', process.env.AUTH_TEST_DATABASE_URL!)
    vi.stubEnv('DB_DRIVER', 'postgres')
    vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000')
    vi.stubEnv('BETTER_AUTH_SECRET', 'integration-test-secret-at-least-32-characters')
    vi.stubEnv('GITHUB_CLIENT_ID', 'test-github-client')
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-github-secret')
    const { auth } = await import('./auth')
    const { db } = await import('./db')
    const email = `auth-test-${crypto.randomUUID()}@example.com`
    const password = 'correct-password-123'
    const request = (path: string, body?: object, cookie?: string) =>
      auth.handler(
        new Request(`http://localhost:3000/api/auth/${path}`, {
          method: body ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'http://localhost:3000',
            ...(cookie ? { Cookie: cookie } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      )

    try {
      const signup = await request('sign-up/email', { name: 'Test User', email, password })
      expect(signup.status).toBe(200)
      const created = await db.select().from(user).where(eq(user.email, email))
      expect(created).toHaveLength(1)
      const credentials = await db.select().from(account).where(eq(account.userId, created[0].id))
      expect(credentials[0].password).toBeTruthy()
      expect(credentials[0].password).not.toBe(password)

      expect((await request('sign-in/email', { email, password: 'wrong-password' })).status).toBe(
        401,
      )
      const login = await request('sign-in/email', { email, password })
      expect(login.status).toBe(200)
      let cookie = login.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ')
      expect(cookie).toContain('better-auth.session_token=')
      const session = await request('get-session', undefined, cookie)
      expect((await session.json()).user.email).toBe(email)
      expect((await request('list-accounts')).status).toBe(401)
      expect(
        (
          await request('change-password', {
            currentPassword: password,
            newPassword: 'new-password-123',
          })
        ).status,
      ).toBe(401)
      const accounts = await (await request('list-accounts', undefined, cookie)).json()
      expect(accounts.map((value: { providerId: string }) => value.providerId)).toContain(
        'credential',
      )
      expect(JSON.stringify(accounts)).not.toContain(credentials[0].password)
      const otherLogin = await request('sign-in/email', { email, password })
      const otherCookie = otherLogin.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ')
      expect(
        (
          await request(
            'change-password',
            { currentPassword: 'wrong-password', newPassword: 'new-password-123' },
            cookie,
          )
        ).status,
      ).toBe(400)
      expect(
        (
          await request(
            'change-password',
            { currentPassword: password, newPassword: 'short' },
            cookie,
          )
        ).status,
      ).toBe(400)
      const changed = await request(
        'change-password',
        { currentPassword: password, newPassword: 'new-password-123', revokeOtherSessions: true },
        cookie,
      )
      expect(changed.status).toBe(200)
      const changedCookie = changed.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ')
      expect(await (await request('get-session', undefined, otherCookie)).json()).toBeNull()
      expect((await request('sign-in/email', { email, password })).status).toBe(401)
      expect((await request('sign-in/email', { email, password: 'new-password-123' })).status).toBe(
        200,
      )
      cookie = changedCookie

      expect(
        (await request('link-social', { provider: 'github', callbackURL: '/settings' })).status,
      ).toBe(401)
      let githubEmail = 'different@example.com'
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = input instanceof Request ? input.url : String(input)
        if (url === 'https://github.com/login/oauth/access_token')
          return Response.json({
            access_token: 'test-token',
            token_type: 'bearer',
            scope: 'read:user,user:email',
          })
        if (url === 'https://api.github.com/user')
          return Response.json({
            id: 123456,
            name: 'GitHub User',
            login: 'github-test',
            email: githubEmail,
          })
        if (url === 'https://api.github.com/user/emails')
          return Response.json([{ email: githubEmail, verified: true, primary: true }])
        throw new Error(`Unexpected provider request: ${url}`)
      })
      async function linkGitHub() {
        const link = await request(
          'link-social',
          {
            provider: 'github',
            callbackURL: '/settings',
            errorCallbackURL: '/settings',
            disableRedirect: true,
          },
          cookie,
        )
        expect(link.status).toBe(200)
        const authorization = new URL((await link.json()).url)
        expect(authorization.origin).toBe('https://github.com')
        expect(authorization.searchParams.get('redirect_uri')).toBe(
          'http://localhost:3000/api/auth/callback/github',
        )
        expect(authorization.searchParams.get('scope')).toContain('user:email')
        const stateCookie = link.headers
          .getSetCookie()
          .map((value) => value.split(';')[0])
          .join('; ')
        return request(
          `callback/github?code=test-code&state=${authorization.searchParams.get('state')}`,
          undefined,
          `${cookie}; ${stateCookie}`,
        )
      }
      async function loginWithGitHub() {
        const response = await request('sign-in/social', {
          provider: 'github',
          callbackURL: '/',
          errorCallbackURL: '/login',
          disableRedirect: true,
        })
        expect(response.status).toBe(200)
        const authorization = new URL((await response.json()).url)
        const stateCookie = response.headers
          .getSetCookie()
          .map((value) => value.split(';')[0])
          .join('; ')
        return request(
          `callback/github?code=test-code&state=${authorization.searchParams.get('state')}`,
          undefined,
          stateCookie,
        )
      }
      const unknownLogin = await loginWithGitHub()
      expect(unknownLogin.headers.get('location')).toContain('/login?error=signup_disabled')
      expect(await db.select().from(user).where(eq(user.email, githubEmail))).toHaveLength(0)
      const mismatch = await linkGitHub()
      expect(mismatch.headers.get('location')).toContain('error=')
      expect(await db.select().from(account).where(eq(account.userId, created[0].id))).toHaveLength(
        1,
      )
      githubEmail = email
      const unlinkedLogin = await loginWithGitHub()
      expect(unlinkedLogin.headers.get('location')).toContain('/login?error=account_not_linked')
      expect(await db.select().from(account).where(eq(account.userId, created[0].id))).toHaveLength(
        1,
      )
      const linked = await linkGitHub()
      expect(linked.headers.get('location')).toBe('/settings')
      const linkedAccounts = await (await request('list-accounts', undefined, cookie)).json()
      expect(linkedAccounts.map((value: { providerId: string }) => value.providerId)).toEqual(
        expect.arrayContaining(['credential', 'github']),
      )
      expect(JSON.stringify(linkedAccounts)).not.toContain('test-token')
      expect(await db.select().from(account).where(eq(account.userId, created[0].id))).toHaveLength(
        2,
      )
      expect((await request('sign-out', {}, cookie)).status).toBe(200)
      expect(await (await request('get-session', undefined, cookie)).json()).toBeNull()
      const githubLogin = await loginWithGitHub()
      expect(githubLogin.headers.get('location')).toBe('/')
      const githubCookie = githubLogin.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ')
      expect((await (await request('get-session', undefined, githubCookie)).json()).user.id).toBe(
        created[0].id,
      )
    } finally {
      await db.delete(user).where(eq(user.email, email))
      if (db.$client instanceof Pool) await db.$client.end()
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    }
  },
  20_000,
)
