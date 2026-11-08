import { createFileRoute } from '@tanstack/react-router'
import { favoritesResponse, publicFavorites } from '@/lib/favorites.server'

export const Route = createFileRoute('/api/lists/$listId')({
  server: {
    handlers: {
      GET: ({ params }) => publicFavorites(params.listId),
      ANY: () => favoritesResponse({ message: 'Method not allowed.' }, 405),
    },
  },
})
