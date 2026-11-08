import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { AuthForm } from './auth-form'

function renderForm(props: Parameters<typeof AuthForm>[0]) {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory(),
    isServer: true,
  })
  return renderToStaticMarkup(
    <RouterContextProvider router={router}>
      <AuthForm {...props} />
    </RouterContextProvider>,
  )
}

test('offers GitHub only for login when configured', () => {
  expect(renderForm({ mode: 'login', githubEnabled: true })).toContain('Log in with GitHub')
  expect(renderForm({ mode: 'login', githubEnabled: false })).not.toContain('Log in with GitHub')
  expect(renderForm({ mode: 'register', githubEnabled: true })).not.toContain('Log in with GitHub')
})

test('explains how to recover from an OAuth callback failure', () => {
  const html = renderForm({ mode: 'login', githubEnabled: true, oauthError: 'account_not_linked' })
  expect(html).toContain('GitHub login failed')
  expect(html).toContain('link GitHub in Settings')
  expect(html).not.toContain('account_not_linked')
})
