import { useEffect, useState } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { passwordChangeSchema } from '@/lib/auth-validation'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

const getAuthSettings = createServerFn({ method: 'GET' }).handler(() => ({
  githubEnabled: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
}))

export const Route = createFileRoute('/settings')({
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  loader: () => getAuthSettings(),
  component: Settings,
})

function Settings() {
  const { data: session, isPending, error } = authClient.useSession()
  const { error: oauthError } = Route.useSearch()
  const { githubEnabled } = Route.useLoaderData()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <Button
          data-testid="home-link"
          variant="outline"
          nativeButton={false}
          render={<Link to="/" />}
        >
          Back to home
        </Button>
        <ModeToggle />
      </div>
      <h1 className="text-3xl font-bold">Settings</h1>
      {isPending ? (
        <p role="status">Loading your settings…</p>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>
            Unable to load your session. Please refresh and try again.
          </AlertDescription>
        </Alert>
      ) : session ? (
        <AccountSettings
          key={session.user.id}
          oauthError={oauthError}
          githubEnabled={githubEnabled}
        />
      ) : (
        <p data-testid="settings-login-required">
          <Link to="/login" className="underline underline-offset-4">
            Log in
          </Link>{' '}
          to manage your settings.
        </p>
      )}
    </main>
  )
}

function AccountSettings({
  oauthError,
  githubEnabled,
}: {
  oauthError?: string
  githubEnabled: boolean
}) {
  const [accounts, setAccounts] = useState<{ providerId: string }[] | null>(null)
  const [accountError, setAccountError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    async function loadAccounts() {
      try {
        const result = await authClient.listAccounts()
        if (!active) return
        if (result.error)
          setAccountError('Unable to load connected accounts. Please refresh and try again.')
        else setAccounts(result.data)
      } catch {
        if (active)
          setAccountError('Unable to load connected accounts. Please refresh and try again.')
      }
    }
    void loadAccounts()
    return () => {
      active = false
    }
  }, [])

  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validators: { onSubmit: passwordChangeSchema },
    onSubmit: async ({ value }) => {
      setPasswordError('')
      setSuccess(false)
      try {
        const result = await authClient.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
          revokeOtherSessions: true,
        })
        if (result.error) {
          setPasswordError(
            result.error.message || 'Unable to change your password. Please try again.',
          )
          return
        }
        form.reset()
        setSuccess(true)
      } catch {
        setPasswordError('Unable to connect. Please try again.')
      }
    },
  })

  async function connectGitHub() {
    setConnecting(true)
    setAccountError('')
    try {
      const result = await authClient.linkSocial({
        provider: 'github',
        callbackURL: '/settings',
        errorCallbackURL: '/settings',
      })
      if (result.error) {
        setAccountError(
          result.error.code === 'PROVIDER_NOT_FOUND'
            ? 'GitHub connections are currently unavailable. Please try again later.'
            : result.error.message || 'Unable to connect GitHub. Please try again.',
        )
        setConnecting(false)
      }
    } catch {
      setAccountError('Unable to connect. Please try again.')
      setConnecting(false)
    }
  }

  const githubConnected = accounts?.some((account) => account.providerId === 'github')
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Change password</h2>
          </CardTitle>
          <CardDescription>
            Use at least 8 characters. Your other sessions will be logged out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void form.handleSubmit()
            }}
          >
            <FieldGroup>
              {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((name) => (
                <form.Field key={name} name={name}>
                  {(field) => {
                    const invalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={name}>
                          {name === 'currentPassword'
                            ? 'Current password'
                            : name === 'newPassword'
                              ? 'New password'
                              : 'Confirm new password'}
                        </FieldLabel>
                        <Input
                          id={name}
                          data-testid={`password-${name}`}
                          name={name}
                          type="password"
                          autoComplete={
                            name === 'currentPassword' ? 'current-password' : 'new-password'
                          }
                          required
                          minLength={name === 'currentPassword' ? 1 : 8}
                          maxLength={128}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            field.handleChange(event.target.value)
                            setSuccess(false)
                          }}
                          aria-invalid={invalid}
                          aria-describedby={invalid ? `${name}-error` : undefined}
                        />
                        {invalid && (
                          <FieldError id={`${name}-error`} errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </form.Field>
              ))}
              {passwordError && (
                <Alert data-testid="password-error" variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              {success && (
                <p data-testid="password-success" role="status">
                  Password updated.
                </p>
              )}
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(submitting) => (
                  <Button data-testid="password-submit" type="submit" disabled={submitting}>
                    {submitting ? 'Updating…' : 'Update password'}
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Connected accounts</h2>
          </CardTitle>
          <CardDescription>
            {githubEnabled
              ? 'Connect GitHub using the same email address as your account.'
              : 'Manage your connected accounts.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {accounts === null && !accountError && <p role="status">Loading connected accounts…</p>}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p>GitHub{githubConnected ? ' — Connected' : ''}</p>
            {githubEnabled && (
              <Button
                variant="outline"
                disabled={!accounts || githubConnected || connecting}
                onClick={() => void connectGitHub()}
              >
                {githubConnected ? 'Connected' : connecting ? 'Connecting…' : 'Connect GitHub'}
              </Button>
            )}
          </div>
          {oauthError && (
            <Alert variant="destructive">
              <AlertDescription>
                GitHub could not be connected. Make sure your GitHub email matches your account and
                try again.
              </AlertDescription>
            </Alert>
          )}
          {accountError && (
            <Alert variant="destructive">
              <AlertDescription>{accountError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </>
  )
}
