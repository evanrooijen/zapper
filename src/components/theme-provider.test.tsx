import { RouterContextProvider, createRootRoute, createRouter } from '@tanstack/react-router'
import { runInNewContext } from 'node:vm'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'

import { ThemeProvider } from './theme-provider'

function initialTheme(stored: string | null, systemDark = false, blocked = false) {
  const classes = new Set<string>()
  const root = {
    classList: {
      add: (value: string) => classes.add(value),
      remove: (...values: string[]) => values.forEach((value) => classes.delete(value)),
    },
    style: { colorScheme: '' },
  }
  const router = createRouter({ routeTree: createRootRoute(), isServer: true })
  const html = renderToStaticMarkup(
    <RouterContextProvider router={router}>
      <ThemeProvider><p>Hello</p></ThemeProvider>
    </RouterContextProvider>,
  )
  const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1]
  expect(script).toBeTruthy()
  runInNewContext(script!, {
    document: { documentElement: root, currentScript: { remove() {} } },
    localStorage: { getItem: () => { if (blocked) throw new Error('Blocked'); return stored } },
    matchMedia: () => ({ matches: systemDark }),
  })
  return { classes: [...classes], colorScheme: root.style.colorScheme }
}

test('defaults to dark before hydration, including invalid or inaccessible storage', () => {
  for (const stored of [null, 'invalid']) {
    expect(initialTheme(stored)).toEqual({ classes: ['dark'], colorScheme: 'dark' })
  }
  expect(initialTheme(null, false, true)).toEqual({ classes: ['dark'], colorScheme: 'dark' })
})

test('restores light or dark preferences and resolves system mode', () => {
  expect(initialTheme('light', true).classes).toEqual(['light'])
  expect(initialTheme('dark').classes).toEqual(['dark'])
  expect(initialTheme('system').classes).toEqual(['light'])
  expect(initialTheme('system', true).classes).toEqual(['dark'])
})
