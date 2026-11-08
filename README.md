# TanStack Start + shadcn/ui

React, TypeScript, TanStack Start, Tailwind CSS 4, and shadcn/ui configured for Base UI (`base-nova`).

## Run locally

Use Node.js 24 (`fnm use` or `nvm use`). The project pins pnpm 12.18.0, the latest npm release when scaffolded.

```sh
npm install --global pnpm@12.18.0
pnpm install
pnpm dev
```

Open http://localhost:3000. Edit `src/routes/index.tsx` to start building. Add file routes in `src/routes`; the router generates `src/routeTree.gen.ts`.

## Checks

```sh
pnpm check
pnpm test
pnpm build
pnpm preview
```

## Add shadcn components

```sh
pnpm dlx shadcn@latest add dialog
```

`components.json` selects Base UI and maps components to `src/components/ui`. Theme tokens live in `src/styles.css`. The included Button uses Base UI's `render` prop for composition.

The TanStack scaffold was generated with the cached official CLI. Registry access was unavailable, so shadcn configuration and the initial Button were added locally. Dependencies, the lockfile, type checking, tests, and production build still need to be completed with registry access.
