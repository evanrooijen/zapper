import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/lists/$listId')({ component: PublicList })

function PublicList() {
  const { listId } = Route.useParams()
  const [entries, setEntries] = useState<{ imdbId: string }[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setEntries(null)
    setError('')
    async function load() {
      try {
        const response = await fetch(`/api/lists/${encodeURIComponent(listId)}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message)
        setEntries(data.entries)
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : 'Unable to load favorites. Please try again.',
          )
      }
    }
    void load()
    return () => controller.abort()
  }, [listId])

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-bold">Favorites list</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : entries === null ? (
        <p role="status">Loading favorites…</p>
      ) : entries.length === 0 ? (
        <p>No favorites yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map(({ imdbId }) => (
            <li key={imdbId}>
              <a className="underline" href={`https://www.imdb.com/title/${imdbId}/`}>
                {imdbId}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
