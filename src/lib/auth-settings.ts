import { createServerFn } from '@tanstack/react-start'

export const getAuthSettings = createServerFn({ method: 'GET' }).handler(() => ({
  githubEnabled: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
}))
