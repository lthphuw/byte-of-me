# apps/web

The Next.js 16 application — public portfolio **and** private CMS dashboard in a
single App Router tree. See the [root README](../../README.md) for setup,
environment variables, and the monorepo overview.

## Route map

| Path | Group | Notes |
| --- | --- | --- |
| `/` | — | Redirects to `/en` |
| `/[locale]` | `(public)` | Homepage |
| `/[locale]/about` · `/experience` · `/projects` · `/blogs` · `/blogs/[slug]` · `/contact` | `(public)` | Server-rendered, cached at the edge |
| `/[locale]/auth/login` | `(auth)` | Email magic link, GitHub, Google |
| `/[locale]/dashboard/*` | `(protected)` | Admin only; `no-store` |
| `/[locale]/[...rest]` | — | 404 |
| `/api/auth/[...nextauth]` | — | Auth.js handlers |
| `/api/og` | — | Dynamic Open Graph images |

`robots.ts`, `sitemap.ts`, and `[locale]/manifest.ts` sit alongside the routes.

Dashboard sections: `blogs`, `comments`, `companies`, `educations`, `media`,
`projects`, `tags`, `tech-stacks`, `translations`, `user-profile`.

## Source layout (Feature-Sliced Design)

```
src/
├── app/        # routes, layouts, providers, route handlers
├── widgets/    # composite page sections   (auth · dashboard · public)
├── features/   # user-facing capabilities  (auth · dashboard · public)
├── entities/   # domain models + their server API and UI
└── shared/     # api · config · hooks · i18n · lib · types · ui
```

A layer may only import from the layers below it. Cross-imports within a layer go
through the slice's `index.ts` barrel.

## Internationalization

Two systems that must never be mixed:

- **next-intl** for static UI strings — `messages/en.json` and `messages/vi.json`.
  Messages are precompiled at build time and typed via the generated
  `messages/*.d.json.ts`, so unknown keys fail type-check. Routing config lives in
  `src/shared/i18n/routing.ts` (`en` default, `vi`).
- **Database translations** for dynamic content — blogs, projects, experience,
  education, tags. Edited from the dashboard, stored in `*Translation` tables.

There is no `middleware.ts`; the locale comes from the `[locale]` segment.

## Data & mutations

- Reads happen in Server Components, as high in the tree as possible.
- Mutations are server actions in `entities/*/api/`, each guarded by
  `requireAdmin()` from `src/shared/lib/auth`.
- Client-side server state uses TanStack Query (`src/shared/lib/query`).

## Scripts

```bash
bun run --filter 'web' dev          # next dev --turbopack
bun run --filter 'web' build        # next build --turbopack
bun run --filter 'web' preview      # build + next start
bun run --filter 'web' test         # bun test
bun run --filter 'web' check-types  # tsc --noEmit
bun run --filter 'web' lint         # eslint .
bun run --filter 'web' format       # prettier over src
```
