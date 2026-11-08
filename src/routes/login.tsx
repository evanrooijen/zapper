import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '@/components/auth-form'
import { getAuthSettings } from '@/lib/auth-settings'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  loader: () => getAuthSettings(),
  component: Login,
})

function Login() {
  const { githubEnabled } = Route.useLoaderData()
  const { error } = Route.useSearch()
  return <AuthForm mode="login" githubEnabled={githubEnabled} oauthError={error} />
}
