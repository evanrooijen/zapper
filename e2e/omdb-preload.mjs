// Stub only the external provider; sessions, server handlers, and persistence stay real.
const originalFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input.toString())
  if (url.hostname !== 'www.omdbapi.com') return originalFetch(input, init)
  const id = url.searchParams.get('i')
  if (id === 'tt0000001') return Response.json({ Response: 'False', Error: 'Movie not found!' })
  if (id === 'tt0000002') return new Response('Unavailable', { status: 503 })
  if (id === 'tt0000003') return Response.json({ Response: 'True', imdbID: id, Type: 'movie' })
  if (id === 'tt0000004') return Response.json({ Response: 'True', imdbID: id, Type: 'episode' })
  if (id === 'tt0000005')
    return Response.json({ Response: 'True', imdbID: 'tt9999999', Type: 'series' })
  if (id === 'tt0000006') return new Response('Rate limit', { status: 429 })
  if (id === 'tt0000007') return Response.json(null)
  if (id === 'tt0000008') throw new DOMException('Timed out', 'TimeoutError')
  return Response.json({
    Response: 'True',
    imdbID: id,
    Type: 'series',
    Title: 'Discard this metadata',
  })
}
