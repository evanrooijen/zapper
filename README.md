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
pnpm check
pnpm test
# Include the real database authentication test (after db:migrate):
AUTH_TEST_DATABASE_URL=postgresql://app:app@localhost:5432/app pnpm test
pnpm build
```

After changing `src/db/schema.ts`, run `pnpm db:generate` and commit the generated migration, then apply it with `pnpm db:migrate`.

Basic authentication includes signup, login, session cookies and logout. Email delivery, verification and password reset are outside this setup.

Forms follow the [shadcn TanStack Form guide](https://ui.shadcn.com/docs/forms/tanstack-form); the server follows the [Better Auth TanStack integration](https://better-auth.com/docs/integrations/tanstack).
