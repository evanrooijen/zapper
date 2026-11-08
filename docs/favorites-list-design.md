# Favorites list — agreed decisions

## Scope

- Each user has one favorites list for now. Multiple lists may be supported in the future.
- The owner can add and remove shows. Ratings, reviews, custom ordering, and watch progress are outside the initial scope.

## Visibility and sharing

- A list starts private and is visible only to its owner.
- Visibility applies to the entire list and all its entries.
- The owner can publish the list so anyone, including visitors without an account, can view it through its URL.
- The owner can make it private again, immediately blocking public access.
- The sharing URL stays the same across visibility changes. Publishing again restores access for previous recipients.

## Adding shows

- Accept an IMDb ID or a full IMDb title URL, extracting the same IMDb ID.
- Before adding, verify through an external source that the ID exists and identifies a TV show. Format validation alone is insufficient.
- Metadata retrieval is deferred to a future feature. Initially display the IMDb ID and a link to IMDb.
- Accept TV series and miniseries; reject movies and individual episodes.
- Each IMDb ID can appear only once in a list. Adding an existing entry leaves the list unchanged and informs the user.
- Show the most recently added entries first.
- If external validation is unavailable, do not save the entry; show a retry message.

## Public page

- Show the favorites without exposing the owner's name or email.
- Give each list a stable, opaque URL such as `/lists/<random-id>`, independent of the owner's username.
- Visitors see the same "List unavailable" response for private and nonexistent lists.

## Validation source

- Use [OMDb](https://www.omdbapi.com/) to validate IMDb IDs and series type. A third-party provider's classification is acceptable, including occasional missing matches for valid IMDb shows.
- An OMDb API key is required. Discard display metadata returned during validation; retrieving metadata for display remains outside the initial scope.
- Live compatibility verification passed with the configured OMDb key: miniseries `tt7366338` and `tt0185906`, and series `tt11280740`, each returned HTTP 200, a successful response, the matching IMDb ID, and `Type: "series"`. Display metadata was not stored.

## Alternatives considered

- OMDb: direct IMDb-ID lookup with minimal integration; chosen with acceptance of third-party coverage limits.
- IMDb datasets: official ID and title-type data, but require dataset maintenance and a review of usage restrictions.
- IMDb API: official data, but requires more subscription and credential setup.
- TMDB: IMDb-ID lookup is available, but depends on TMDB's title mappings.

## Review status

The user confirmed shared understanding and approved this design on 2026-11-08. The design interview is complete; implementation is a separate task.
