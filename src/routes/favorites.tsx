import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/favorites')({ component: Favorites })

type FavoritesData = { id: string; isPublic: boolean; entries: { imdbId: string }[] }

function Favorites() {
  const [list, setList] = useState<FavoritesData | null>(null)
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const response = await fetch('/api/favorites', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    setList(data)
  }
  useEffect(() => {
    void load().catch((cause) =>
      setError(
        cause instanceof Error ? cause.message : 'Unable to load favorites. Please refresh.',
      ),
    )
  }, [])

  async function mutate(data: object) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message)
      setMessage(result.message)
      await load()
      if ('action' in data && data.action === 'add') setInput('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to connect. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col gap-6 px-6 py-12">
      <Link to="/" className="underline">
        Back to home
      </Link>
      <h1 className="text-3xl font-bold">My favorites</h1>
      {error && <p role="alert">{error}</p>}
      {!list && !error && <p role="status">Loading favorites…</p>}
      {list && (
        <>
          <p>{list.isPublic ? 'Your list is public.' : 'Your list is private.'}</p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void mutate({ action: 'visibility', isPublic: !list.isPublic })}
          >
            {list.isPublic ? 'Make private' : 'Make public'}
          </Button>
          <p>
            <a className="underline" href={`/lists/${list.id}`}>
              Open sharing link
            </a>
            {!list.isPublic && ' (available to visitors after publishing)'}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void mutate({ action: 'add', input })
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="imdb-input">IMDb ID or title URL</FieldLabel>
                <Input
                  id="imdb-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  required
                  maxLength={2048}
                  disabled={busy}
                />
              </Field>
              <Button type="submit" disabled={busy}>
                Add show
              </Button>
            </FieldGroup>
          </form>
          {message && <p role="status">{message}</p>}
          {list.entries.length === 0 ? (
            <p>No favorites yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.entries.map(({ imdbId }) => (
                <li key={imdbId} className="flex items-center justify-between gap-3">
                  <a className="underline" href={`https://www.imdb.com/title/${imdbId}/`}>
                    {imdbId}
                  </a>
                  <Button
                    variant="outline"
                    disabled={busy}
                    aria-label={`Remove ${imdbId}`}
                    onClick={() => void mutate({ action: 'remove', imdbId })}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
