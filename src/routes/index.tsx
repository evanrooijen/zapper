import { createFileRoute } from '@tanstack/react-router'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="flex min-h-svh flex-col items-start justify-center gap-6 p-8">
      <div className="fixed top-4 right-4">
        <ModeToggle />
      </div>
      <h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
      <p className="text-muted-foreground">
        Edit <code>src/routes/index.tsx</code> to get started.
      </p>
      <Button nativeButton={false} render={<a href="https://tanstack.com/start/latest/docs/framework/react/overview" />}>
        Read the docs
      </Button>
    </main>
  )
}
