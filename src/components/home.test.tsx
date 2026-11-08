import { RouterContextProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'

import { authClient } from '@/lib/auth-client'
import { Route } from '@/routes/index'

vi.mock('@/components/mode-toggle', () => ({ ModeToggle: () => null }))
vi.mock('@/lib/auth-client', () => ({ authClient: { useSession: vi.fn(), signOut: vi.fn() } }))

beforeAll(async () => { await Route.options.component?.preload?.() })
afterEach(() => vi.restoreAllMocks())

const user = { id: '1', name: 'Ada', email: 'ada@example.com', emailVerified: true, createdAt: new Date(), updatedAt: new Date() }

function renderHome(pending: boolean, currentUser: typeof user | null = null, error: object | null = null) {
  vi.mocked(authClient.useSession).mockReturnValue({ data: currentUser ? { user: currentUser } : null, isPending: pending, error } as ReturnType<typeof authClient.useSession>)
  const router = createRouter({ routeTree: createRootRoute(), history: createMemoryHistory(), isServer: true })
  return renderToStaticMarkup(
    <RouterContextProvider router={router}>
      {createElement(Route.options.component!)}
    </RouterContextProvider>,
  )
}

test('renders an accessible skeleton immediately without a blocking loader', () => {
  expect(Route.options.loader).toBeUndefined()
  const html = renderHome(true)
  expect(html).toContain('aria-busy="true"')
  expect(html).toContain('role="status"')
  expect(html).toContain('Loading your session')
  expect(html.match(/data-slot="skeleton"/g)).toHaveLength(3)
  expect(html).not.toContain('href="/login"')
})

test('replaces the skeleton with the signed-in user and logout action', () => {
  const html = renderHome(false, user)
  expect(html).toContain('Welcome, Ada')
  expect(html).toContain('ada@example.com')
  expect(html).toContain('Log out')
  expect(html).toContain('href="/settings"')
  expect(html).not.toContain('data-slot="skeleton"')
})

test('shows anonymous actions when the session resolves without a user', () => {
  const html = renderHome(false)
  expect(html).toContain('Create account')
  expect(html).toContain('href="/login"')
  expect(html).not.toContain('data-slot="skeleton"')
})

test('keeps session errors visible', () => {
  expect(renderHome(false, null, { message: 'Network failure' })).toContain('Unable to load your session')
})
