import { createFileRoute } from '@tanstack/react-router'
import { ownerFavorites } from '@/lib/favorites.server'

export const Route = createFileRoute('/api/favorites')({
  server: {
    handlers: {
      GET: ({ request }) => ownerFavorites(request),
      POST: ({ request }) => ownerFavorites(request),
    },
  },
})
