import { RouterContextProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, expect, test, vi } from 'vitest'
import { authClient } from '@/lib/auth-client'
import { Route } from '@/routes/settings'

vi.mock('@/components/mode-toggle', () => ({ ModeToggle: () => null }))
vi.mock('@/lib/auth-client', () => ({ authClient: { useSession: vi.fn() } }))

beforeAll(async () => { await Route.options.component?.preload?.() })

function renderSettings(state: object, githubEnabled = true) {
  vi.mocked(authClient.useSession).mockReturnValue(state as ReturnType<typeof authClient.useSession>)
  vi.spyOn(Route, 'useSearch').mockReturnValue({})
  vi.spyOn(Route, 'useLoaderData').mockReturnValue({ githubEnabled })
  const router = createRouter({ routeTree: createRootRoute(), history: createMemoryHistory(), isServer: true })
  return renderToStaticMarkup(
    <RouterContextProvider router={router}>{createElement(Route.options.component!)}</RouterContextProvider>,
  )
}

test('settings hides account controls until a session is authenticated', () => {
  for (const state of [
    { isPending: true },
    { isPending: false, data: null },
    { isPending: false, error: { message: 'Network failure' } },
  ]) {
    const html = renderSettings(state)
    expect(html).not.toContain('name="currentPassword"')
    expect(html).not.toContain('Connect GitHub')
  }
  expect(renderSettings({ isPending: false, data: null })).toContain('href="/login"')
  expect(renderSettings({ error: { message: 'Network failure' } })).toContain('Unable to load your session')
})

test('signed-in settings renders labeled password controls and waits for connected accounts', () => {
  const html = renderSettings({ isPending: false, data: { user: { id: '1' } } })
  expect(html.toLowerCase()).toContain('autocomplete="current-password"')
  expect(html).toContain('name="confirmPassword"')
  expect(html).toContain('Update password')
  expect(html).toContain('Loading connected accounts')
  expect(html).toContain('Connect GitHub')
})


test('settings hides the GitHub connection button when GitHub is not configured', () => {
  const html = renderSettings({ isPending: false, data: { user: { id: '1' } } }, false)
  expect(html).toContain('Update password')
  expect(html).not.toContain('Connect GitHub')
})
