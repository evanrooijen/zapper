# TanStack Start + Better Auth

Email/password authentication with Better Auth, Drizzle, TanStack Form and shadcn/ui (Base UI).

## Run locally

Use Node.js 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Replace BETTER_AUTH_SECRET with the output of: openssl rand -base64 32
docker compose up -d --wait
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000, register an account, then sign out and log in again. The app runs on your host; Compose supplies PostgreSQL with a persistent volume. `docker compose down` stops the database while preserving accounts. Local database credentials are development-only.

If you use another port, update `BETTER_AUTH_URL` to match and restart the dev server.

## Production with Neon

Set these server environment variables:

- `DATABASE_URL`: the Neon PostgreSQL connection string, including `sslmode=require`.
- `DB_DRIVER=neon`: selects the Neon serverless HTTP driver.
- `BETTER_AUTH_URL`: your application's public HTTPS origin.
- `BETTER_AUTH_SECRET`: a private random value of at least 32 characters.

Run `pnpm db:migrate` against the production database before starting the deployment. Drizzle Kit uses the PostgreSQL connection string for migrations; the app uses Neon's serverless driver. Keep secrets server-side; never prefix them with `VITE_`. Configure your host to serve the TanStack Start server build and supply these variables at runtime.

## Checks and schema changes

```sh
pnpm lint
pnpm format:check
pnpm check
pnpm test
# Include the real database authentication test (after db:migrate):
AUTH_TEST_DATABASE_URL=postgresql://app:app@localhost:5432/app pnpm test
pnpm build
```

Run `pnpm format` to format files and `pnpm lint:fix` to apply automatic lint fixes.

After changing `src/db/schema.ts`, run `pnpm db:generate` and commit the generated migration, then apply it with `pnpm db:migrate`.

Basic authentication includes signup, login, session cookies and logout. Email delivery, verification and password reset are outside this setup.

Forms follow the [shadcn TanStack Form guide](https://ui.shadcn.com/docs/forms/tanstack-form); the server follows the [Better Auth TanStack integration](https://better-auth.com/docs/integrations/tanstack).

## Browser tests

Playwright tests registration, session persistence, logout, invalid credentials, and password changes through the real UI and database. It verifies that the old password is rejected and the new password works.

Both e2e scripts use dotenvx to load `.env` before starting Playwright. With `.env` configured for a local development or test database:

```sh
docker compose up -d --wait
pnpm db:migrate
pnpm exec playwright install chromium
pnpm test:e2e
# Optional interactive runner:
pnpm test:e2e:ui
```

The CI workflow runs these browser tests after database migrations and unit tests. It copies `.env.example` to `.env` (the job's environment variables take precedence), installs Chromium with its Linux dependencies, and uploads `test-results/` on failure as the `playwright-test-results` artifact, retained for 7 days.

Playwright uses `BETTER_AUTH_URL` from `.env`, falling back to `http://localhost:3000`, and starts its own server on that port. Stop any server already using the configured port before running the tests. Each run registers a unique disposable account and deletes it (including its sessions and credentials) in cleanup, even after a test failure. Existing accounts are left alone. Use a development or test database, not production. Browser tests are separate from `pnpm test`; failure traces are saved under `test-results/` and may contain test credentials.

## User settings and GitHub connections

Signed-in users can open **Settings** from the home page to change their password or connect GitHub. Password changes require the current password and revoke other sessions.

To enable GitHub, create a GitHub OAuth App and set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` on the server, then restart it. Use `http://localhost:3000/api/auth/callback/github` as the authorization callback URL locally, or `<BETTER_AUTH_URL>/api/auth/callback/github` in production. Use separate OAuth apps for local and production environments. The default GitHub scopes include `user:email`.

The GitHub account must have a verified email matching the app account. Connections are added explicitly from settings; implicit account linking and new GitHub-only registrations are disabled. See the [Better Auth GitHub setup](https://better-auth.com/docs/authentication/github) and [account linking documentation](https://better-auth.com/docs/concepts/users-accounts).
