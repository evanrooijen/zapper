## Problem Statement

Users cannot maintain their favorite TV shows in Zapper or share their favorites while controlling who can view them.

## Solution

Give each signed-in user one favorites list, private by default. Owners add shows using IMDb IDs or title URLs, remove entries, and publish or privatize the whole list. A public list is viewable by anyone through a stable, opaque URL without revealing the owner's name or email.

## User Stories

1. As a user, I want one favorites list, so that I can keep my favorite TV shows together.
2. As an owner, I want my list to start private, so that sharing requires my explicit choice.
3. As an owner, I want to view my private list, so that I can maintain it before sharing.
4. As an owner, I want to add a show by IMDb ID, so that I can identify the exact show.
5. As an owner, I want to add a show by IMDb title URL, so that I can paste a link I already have.
6. As an owner, I want both input forms to identify the same show, so that URL formatting does not create separate entries.
7. As an owner, I want malformed input rejected with an explanation, so that I can correct it.
8. As an owner, I want IMDb IDs verified against an external source, so that nonexistent shows are not saved.
9. As an owner, I want to add TV series, so that ongoing and completed series can be favorites.
10. As an owner, I want to add miniseries, so that limited series can also be favorites.
11. As an owner, I want movies and individual episodes rejected, so that the list contains TV shows.
12. As an owner, I want duplicate additions to leave the list unchanged and explain that the show is already a favorite, so that each show appears once.
13. As an owner, I want validation outages to leave my list unchanged and show a retry message, so that I know the addition was not saved.
14. As an owner, I want to see each entry's IMDb ID and IMDb link, so that I can identify and visit the show without stored metadata.
15. As an owner, I want newest additions first, so that I can easily find recent favorites.
16. As an owner, I want to remove an entry, so that my list reflects my current favorites.
17. As an owner, I want changes to persist across reloads and sessions, so that my favorites are not lost.
18. As an owner, I want to publish my whole list, so that others can view all its entries together.
19. As an owner, I want a shareable URL, so that I can send others directly to my public list.
20. As a visitor without an account, I want to view a public list, so that I can see shared favorites without registering.
21. As a visitor, I want to follow an entry's IMDb link, so that I can learn about the show.
22. As an owner, I want to make a public list private again, so that subsequent public requests cannot read it.
23. As an owner, I want the sharing URL to stay unchanged across visibility changes, so that publishing again restores access through the same link.
24. As an owner, I want sharing links independent of my username, so that account changes do not break them or reveal my identity.
25. As an owner, I want my name and email omitted from public list responses, so that sharing favorites does not share account details.
26. As an owner, I want other users and anonymous visitors prevented from changing my list, so that only I control it.
27. As an owner, I want private and nonexistent links to return the same unavailable response to visitors, so that a private list's existence is not disclosed.
28. As a visitor, I want an empty public list to render clearly, so that I can distinguish an empty list from an unavailable one.

## Implementation Decisions

- Reuse the existing TanStack Start application, Better Auth sessions, Drizzle/Postgres persistence, and shared UI components. The current application has authentication and settings but no favorites functionality.
- Introduce a favorites list owned by a user with a stable opaque identifier and list-level visibility defaulting to private. Enforce at most one list per user for this release; keep entries associated with a list rather than adding favorites directly to authentication records. Multiple-list workflows are deferred.
- Store favorite entries with their list association, canonical IMDb ID, and addition time. Enforce uniqueness per list and IMDb ID, including concurrent additions. Sort newest additions first with deterministic ties.
- Provide authenticated owner read, add, remove, and visibility-change operations, and a public read by opaque list identifier. Derive ownership from the server session and check it for every owner operation; never trust a client-supplied owner identity.
- Provide an owner management view and a public list view. Use the stable list identifier for a route such as `/lists/<random-id>`; the exact route spelling is an implementation detail.
- Parse supported IMDb title URLs and bare IDs into the same canonical ID. Reject unsupported URLs and malformed values. Build the provider request from the extracted ID against the fixed OMDb endpoint; do not fetch arbitrary user-supplied URLs.
- Validate additions server-side using OMDb with a server-only API key. Require a successful lookup matching the requested ID and an eligible series classification. Accept series and miniseries; reject movies, episodes, and unknown IDs.
- Treat provider coverage limits as acceptable: a valid IMDb show missing from OMDb is not added. Do not fall back to format-only validation.
- On timeout, rate limiting, unavailable provider, or unusable provider response, save nothing and return a retryable error. Preserve existing entries and visibility when an operation fails.
- The OMDb response may contain metadata, but discard display metadata. Store and render only the IMDb ID and a canonical IMDb link for each entry in this release.
- A duplicate is a no-op with an already-favorite message; it must not change entry order.
- Public visibility covers every entry. Private lists remain readable by their owner, while other users and anonymous visitors receive the same unavailable response as for nonexistent identifiers.
- Public response data must omit owner identity and account details, including serialized loader or API data. Public visitors have no mutation rights.
- Visibility checks must apply on each read. Do not let shared caches serve list contents after the owner makes the list private. Already viewed or copied information cannot be recalled.
- Reuse the same sharing URL after private/public transitions. Publishing again intentionally restores access for previous recipients.
- Include accessible form labels, operation feedback, and empty-list states using existing UI patterns.

## Testing Decisions

- Proposed primary seam: browser-level Playwright tests exercising the real application, authentication, server operations, and database. Prefer observable results and persisted behavior over component internals, private helpers, or assertions that mirror implementation.
- Prior art: the existing authentication browser test creates a real user, exercises complete flows, reloads to verify persistence, and cleans up database records. Reuse that pattern for favorites and use isolated owner, other-user, and anonymous browser contexts.
- At this seam, cover private defaults, both input forms, successful additions, removal, persistence, newest-first ordering, duplicate no-ops, whole-list publishing, anonymous reads, privatization, republishing with the same URL, and empty lists.
- Cover unauthorized reads and mutation attempts, including direct requests as a different user and without a session; verify data and visibility remain unchanged. Compare private and nonexistent visitor responses, and check response data for owner identity leakage.
- Add a controllable server-side OMDb HTTP boundary for tests, keeping application and database behavior real. Browser request interception alone cannot stub server-originated provider calls. Choose the smallest fixture arrangement compatible with the existing test server, without a production bypass for authentication or validation.
- Use deterministic provider responses for valid series and miniseries, movie, episode, unknown ID, mismatched ID, timeout, rate limiting, and malformed responses. Assert messages and unchanged persisted state on failures. Routine tests must not depend on live OMDb availability or consume its quota.
- Check canonicalization and concurrent duplicate submissions through application behavior. Add lower-level tests only where the browser seam cannot meaningfully exercise a boundary; avoid parallel suites repeating the same assertions.
- Separately perform a credentialed live provider check for representative miniseries before implementation relies on OMDb's series classification. This is a prerequisite compatibility check, not a routine test dependency.
- Browser tests through the real application and database, with controlled outbound OMDb responses, were carried into the approved ticket breakdown and implementation request.

## Out of Scope

- Multiple lists per user or UI for creating, naming, choosing, or deleting lists.
- Per-entry visibility, collaborative editing, and selective sharing with specific users.
- Display metadata retrieval, background enrichment, show titles, premiere years, and posters.
- Catalog search, ratings, reviews, rankings, custom ordering, and watch progress.
- Public discovery, owner profiles, username-based URLs, and search indexing features.
- Sharing-link rotation and recalling information already seen or copied by visitors.
- New authentication systems or a general provider abstraction.

## Further Notes

- This spec synthesizes the approved design interview; persistence and authorization details make the agreed behavior implementable rather than expanding product scope.
- OMDb API credentials are required for the live compatibility check and production validation. The public documentation describes series type but does not explicitly document miniseries mapping; the live compatibility result below confirms representative miniseries satisfy the implemented acceptance rule.
- OMDb documentation: https://www.omdbapi.com/ ; API-key signup: https://www.omdbapi.com/apikey.aspx . No live credentialed provider calls have been made during specification.
- After the user supplied the OMDb key, live compatibility verification passed for miniseries `tt7366338` and `tt0185906` and series `tt11280740`: each returned HTTP 200, a successful response, the matching IMDb ID, and `Type: "series"`. Display metadata was not stored.
