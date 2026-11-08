import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { data: session, isPending, error: sessionError } = authClient.useSession()
  const user = session?.user
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setError('')
    setSigningOut(true)
    try {
      const result = await authClient.signOut()
      if (result.error) setError('Unable to log out. Please try again.')
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-start justify-center gap-6 p-8">
      <div className="fixed top-4 right-4">
        <ModeToggle />
      </div>
      <div
        className="grid w-full max-w-xl grid-rows-[2.5rem_1.5rem_2.25rem] gap-6"
        aria-busy={isPending}
      >
        {isPending ? (
          <>
            <span className="sr-only" role="status">
              Loading your session…
            </span>
            <Skeleton
              className="h-10 w-72 max-w-full motion-reduce:animate-none"
              aria-hidden="true"
            />
            <Skeleton
              className="h-6 w-80 max-w-full motion-reduce:animate-none"
              aria-hidden="true"
            />
            <Skeleton className="h-9 w-28 motion-reduce:animate-none" aria-hidden="true" />
          </>
        ) : (
          <>
            <h1
              className="truncate text-4xl font-bold"
              title={user ? `Welcome, ${user.name}` : undefined}
            >
              {user ? `Welcome, ${user.name}` : 'Welcome'}
            </h1>
            <p className="truncate text-muted-foreground" title={user?.email}>
              {user
                ? `You’re logged in as ${user.email}.`
                : 'Log in or create an account to get started.'}
            </p>
            <div className="flex gap-3">
              {user ? (
                <>
                  <Button variant="outline" nativeButton={false} render={<Link to="/settings" />}>
                    Settings
                  </Button>
                  <Button disabled={signingOut} onClick={() => void signOut()}>
                    {signingOut ? 'Logging out…' : 'Log out'}
                  </Button>
                </>
              ) : (
                <>
                  <Button nativeButton={false} render={<Link to="/login" />}>
                    Log in
                  </Button>
                  <Button variant="outline" nativeButton={false} render={<Link to="/register" />}>
                    Create account
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      {(error || sessionError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {error || 'Unable to load your session. Please refresh and try again.'}
          </AlertDescription>
        </Alert>
      )}
    </main>
  )
}
