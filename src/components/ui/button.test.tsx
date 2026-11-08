import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'

import { Button } from './button'

test('renders a disabled native button and a composed link', () => {
  const button = renderToStaticMarkup(<Button disabled>Save</Button>)
  expect(button).toContain('<button')
  expect(button).toContain('disabled=""')
  expect(button).toContain('Save</button>')

  const link = renderToStaticMarkup(
    <Button nativeButton={false} render={<a href="/docs" />}>Docs</Button>,
  )
  expect(link).toContain('<a ')
  expect(link).toContain('href="/docs"')
  expect(link).toContain('Docs</a>')
})
