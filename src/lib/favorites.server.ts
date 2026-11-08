import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { favoriteEntry, favoritesList } from '@/db/schema'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export function favoritesResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  })
}

const mutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), input: z.string().trim().min(1).max(2048) }).strict(),
  z.object({ action: z.literal('remove'), imdbId: z.string().regex(/^tt\d{7,}$/) }).strict(),
  z.object({ action: z.literal('visibility'), isPublic: z.boolean() }).strict(),
])

function imdbIdFromInput(input: string) {
  if (/^tt\d{7,}$/.test(input)) return input
  try {
    const url = new URL(input)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      !['imdb.com', 'www.imdb.com', 'm.imdb.com'].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      return null
    return /^\/title\/(tt\d{7,})\/?$/.exec(url.pathname)?.[1] ?? null
  } catch {
    return null
  }
}

async function entries(listId: string) {
  return db
    .select({ imdbId: favoriteEntry.imdbId })
    .from(favoriteEntry)
    .where(eq(favoriteEntry.listId, listId))
    .orderBy(desc(favoriteEntry.addedAt), desc(favoriteEntry.id))
}

export async function ownerFavorites(request: Request) {
  try {
    if (request.method !== 'GET' && request.headers.get('origin') !== new URL(request.url).origin) {
      return favoritesResponse({ message: 'Forbidden.' }, 403)
    }
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) return favoritesResponse({ message: 'Log in to manage your favorites.' }, 401)
    await db
      .insert(favoritesList)
      .values({ id: randomUUID(), userId: session.user.id })
      .onConflictDoNothing({ target: favoritesList.userId })
    const [list] = await db
      .select()
      .from(favoritesList)
      .where(eq(favoritesList.userId, session.user.id))
    if (request.method === 'GET')
      return favoritesResponse({
        id: list.id,
        isPublic: list.isPublic,
        entries: await entries(list.id),
      })
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return favoritesResponse({ message: 'Invalid request.' }, 400)
    }
    const parsed = mutationSchema.safeParse(body)
    if (!parsed.success) return favoritesResponse({ message: 'Invalid request.' }, 400)
    const data = parsed.data
    if (data.action === 'visibility') {
      await db
        .update(favoritesList)
        .set({ isPublic: data.isPublic })
        .where(eq(favoritesList.id, list.id))
      return favoritesResponse({
        message: data.isPublic ? 'List published.' : 'List made private.',
      })
    }
    if (data.action === 'remove') {
      await db
        .delete(favoriteEntry)
        .where(and(eq(favoriteEntry.listId, list.id), eq(favoriteEntry.imdbId, data.imdbId)))
      return favoritesResponse({ message: 'Favorite removed.' })
    }
    const imdbId = imdbIdFromInput(data.input)
    if (!imdbId) return favoritesResponse({ message: 'Enter a valid IMDb ID or title URL.' }, 400)
    const [existing] = await db
      .select({ id: favoriteEntry.id })
      .from(favoriteEntry)
      .where(and(eq(favoriteEntry.listId, list.id), eq(favoriteEntry.imdbId, imdbId)))
    if (existing) return favoritesResponse({ message: 'Already a favorite.' })
    try {
      if (!process.env.OMDB_API_KEY) throw new Error('Missing provider credentials')
      const url = new URL('https://www.omdbapi.com/')
      url.searchParams.set('apikey', process.env.OMDB_API_KEY)
      url.searchParams.set('i', imdbId)
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) throw new Error('Provider unavailable')
      const result = z
        .object({
          Response: z.enum(['True', 'False']),
          imdbID: z.string().optional(),
          Type: z.string().optional(),
          Error: z.string().optional(),
        })
        .parse(await response.json())
      if (result.Response === 'False') {
        if (result.Error === 'Movie not found!' || result.Error === 'Incorrect IMDb ID.')
          return favoritesResponse({ message: 'Show not found.' }, 400)
        throw new Error('Provider unavailable')
      }
      if (result.imdbID !== imdbId || !['series', 'movie', 'episode'].includes(result.Type ?? ''))
        throw new Error('Invalid provider response')
      if (result.Type !== 'series')
        return favoritesResponse({ message: 'Only TV series and miniseries can be added.' }, 400)
    } catch {
      return favoritesResponse({ message: 'Unable to validate this show. Please try again.' }, 503)
    }
    const inserted = await db
      .insert(favoriteEntry)
      .values({ id: randomUUID(), listId: list.id, imdbId })
      .onConflictDoNothing()
      .returning()
    return favoritesResponse({
      message: inserted.length ? 'Favorite added.' : 'Already a favorite.',
    })
  } catch {
    return favoritesResponse({ message: 'Unable to update favorites. Please try again.' }, 500)
  }
}

export async function publicFavorites(listId: string) {
  try {
    const rows = await db
      .select({ imdbId: favoriteEntry.imdbId })
      .from(favoritesList)
      .leftJoin(favoriteEntry, eq(favoriteEntry.listId, favoritesList.id))
      .where(and(eq(favoritesList.id, listId), eq(favoritesList.isPublic, true)))
      .orderBy(desc(favoriteEntry.addedAt), desc(favoriteEntry.id))
    if (rows.length === 0) return favoritesResponse({ message: 'List unavailable' }, 404)
    return favoritesResponse({
      entries: rows.flatMap(({ imdbId }) => (imdbId === null ? [] : [{ imdbId }])),
    })
  } catch {
    return favoritesResponse({ message: 'Unable to load favorites. Please try again.' }, 503)
  }
}
