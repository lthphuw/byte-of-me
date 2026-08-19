# Byte of Me

**A multilingual portfolio, headless CMS, and private knowledge base — logged one byte at a time.**

A production personal website with a public portfolio, a multilingual content dashboard, and a private notes workspace. Built as a TypeScript monorepo on Next.js 16 and the App Router.

Live at [phu-lth.space](https://phu-lth.space/).

---

## Overview

**Byte of Me** is a personal portfolio that doubles as its own content platform. Visitors get a fast, animated, fully bilingual (English / Tiếng Việt) site; the owner gets a private dashboard to write blog posts, manage projects and work history, and translate everything — without touching code or redeploying — plus a private, Obsidian-style workspace for interlinked notes.

The whole thing is a single TypeScript monorepo, organized with [Feature-Sliced Design](https://feature-sliced.design/) on the frontend and shared workspace packages for the database, storage, logging, UI kit, and tooling config.

<div align="center">
  <img src="docs/pub1.png" alt="Byte of Me — public portfolio" width="80%" />
</div>

---

## Highlights

### Public portfolio
- **Home, About, Experience, Projects, Blogs, Contact** — server-rendered, SEO-friendly, and richly animated with Framer Motion.
- **Full-featured blog** — cover hero, author byline, breadcrumb, table of contents, reading-progress bar, related posts, related project, prev/next navigation, and per-post **likes, claps, and threaded comments**.
- **Filterable, paginated** project and blog listings with shareable, URL-based filters.
- **A vertical experience timeline** rendered from live CMS data (companies → roles → tasks).
- **Contact form** that persists the message and delivers it over SMTP (Nodemailer).
- **SEO & sharing built in** — dynamic OG images (`/api/og`, Satori), `sitemap.ts`, `robots.ts`, PWA `manifest.ts`, per-route metadata.

### Private notes workspace

A second private surface at `/space`, separate from the CMS: nothing here is ever published.

- **Obsidian-style editor** — WYSIWYG markdown (typing `# ` becomes a heading), a raw-source toggle, and **live KaTeX** for inline `$…$` and block `$$…$$` math.
- **Bi-directional links** — type `[[` to link a note; each note shows both its outgoing links and its backlinks.
- **Knowledge graph** at `/space/graph` — a `d3-force` simulation on a `devicePixelRatio`-aware canvas. Nodes are sized by link count, unlinked notes are drawn dimmer rather than hidden, hovering highlights a neighbourhood, and clicking opens the note. Wheel and pinch zoom hold the point under the cursor; the simulation pauses while the tab is hidden.
- **Three explorer views** — a folder tree, a flat list, or grouped by status or label — with drag-and-drop reordering, re-parenting, and moves between groups (mouse and touch).
- **Full-text search** over titles and bodies, backed by a Postgres generated `tsvector` column and a GIN index, with highlighted snippets.
- **Everything paginates.** The tree loads one level per folder as it expands, the flat and grouped views scroll infinitely, and the trash reads only what is archived — so the sidebar's cost does not grow with the number of notes owned.
- **Properties** — free-form status, labels, and key→value frontmatter, groupable in the explorer.
- **Export** — `.md` with hand-emitted YAML frontmatter, or a chromeless print view that Chrome's "Save as PDF" turns into a text-true document with real KaTeX glyphs.
- Command palette (`Cmd/Ctrl+K`) and a markdown cheat-sheet (`Cmd/Ctrl+/`).

### Private CMS dashboard
- Manage **blogs, projects, companies & roles, education, tags, tech stacks, media, comments, social links, user profile, and translations** from one place.
- **Analytics** — dashboard stats plus a per-blog analytics overview backed by page-view and interaction logs.
- **Comment moderation** — hide/show any comment on any post.
- **Rich-text editor** (TipTap 3) with code blocks (lowlight), images, tables, typography, text align/color/highlight, and a table-of-contents extension.
- **Media library** backed by S3-compatible object storage (Supabase Storage).
- Protected by **Auth.js v5** — magic-link email, GitHub, and Google sign-in, with `ADMIN`/`USER` roles.

### Two-layer internationalization
- **Static UI** strings (buttons, labels, nav, validation) via **next-intl** locale files, precompiled at build time with generated TypeScript declarations (`messages/en.d.json.ts`) so message keys are type-checked.
- **Dynamic content** (blogs, projects, experience, education, tags…) translated and stored **in PostgreSQL** via per-model `*Translation` tables, editable from the dashboard.
- Locales: `en` (default) and `vi`, carried in the `[locale]` route segment.

> These two systems are never mixed — UI strings never live in the database, and content never lives in locale JSON.

### Engineered for quality
- **Feature-Sliced Design** architecture with clear `app → widgets → features → entities → shared` boundaries.
- **Server Components first**; server actions for mutations, TanStack Query for client-side server state.
- **Bundle discipline** — subpath exports keep TipTap out of public-site JS; `optimizePackageImports` deep-imports the barrel packages (`lucide-react`, `react-icons`, `date-fns`, `framer-motion`, …).
- **Edge caching by route group** — public pages get `s-maxage=3600, stale-while-revalidate=86400`; every dashboard route is `no-store`.
- **Turborepo + Bun** workspace with shared, independently-typed packages and a full `type-check → lint → test → build` gate.

<div align="center">
  <table>
    <tr>
      <td><img src="docs/pub2.png" alt="Projects listing with tag and tech-stack filters" /></td>
      <td><img src="docs/pub3.png" alt="Blog detail with table of contents" /></td>
    </tr>
  </table>
</div>

---

## The dashboard

<div align="center">
  <table>
    <tr>
      <td><img src="docs/dash1.png" alt="Dashboard overview with content stats and analytics" /></td>
      <td><img src="docs/dash2.png" alt="Blog management" /></td>
      <td><img src="docs/dash3.png" alt="TipTap rich-text editor with outline panel" /></td>
    </tr>
  </table>
</div>

---

## Tech stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 16 (App Router, RSC, Server Actions), React 19, Turbopack (dev **and** build) |
| **Language** | TypeScript 5.8 (strict) |
| **Styling** | Tailwind CSS 3, shadcn/ui + Radix primitives, Framer Motion, `next-themes` |
| **Data** | PostgreSQL 16 via Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| **Server state** | TanStack Query v5 |
| **Auth** | Auth.js / NextAuth v5 — email magic link, GitHub & Google OAuth, JWT sessions, role-based |
| **i18n** | next-intl v4 (UI) + database translations (content) |
| **Storage** | `@byte-of-me/storage` — S3-compatible client (AWS SDK v3) pointed at Supabase Storage |
| **Editor** | TipTap 3 + lowlight/highlight.js, KaTeX for maths, `@tiptap/markdown` |
| **Visualization** | `d3-force` on a hand-drawn canvas (knowledge graph) |
| **Email** | Nodemailer (SMTP) — sign-in links and contact-form delivery |
| **Forms & validation** | React Hook Form + Zod; env parsed with `@t3-oss/env-nextjs` |
| **Analytics** | Vercel Analytics & Speed Insights, Google Analytics (`@next/third-parties`), plus first-party page-view/interaction logging |
| **Testing** | `bun test` |
| **Tooling** | Turborepo, Bun workspaces, ESLint 9 (flat config), Prettier, Husky + commitlint |

---

## Architecture

> **[docs/architecture.md](docs/architecture.md)** has the full picture as diagrams — system context, package graph, FSD layers, request & trust flow, and the two-layer i18n model.

The frontend follows **Feature-Sliced Design** — each layer may only depend on the layers below it, keeping features isolated and reusable:

| Layer | Responsibility | Examples |
| --- | --- | --- |
| `app/` | App Router routes, layouts, providers, route handlers | `(public)`, `(protected)/dashboard`, `(auth)`, `api/og` |
| `widgets/` | Composite page sections | `public-site-header`, `blog-manager`, `note-manager`, `space-graph` |
| `features/` | User-facing capabilities | `blog-comment`, `note-editor`, `note-explorer`, `note-graph`, `media-library` |
| `entities/` | Domain models with their server API + UI | `blog`, `note`, `project`, `company`, `tag` |
| `shared/` | Config, i18n, libs, primitives, hooks | `config/env`, `i18n/routing`, `lib/auth`, `api/s3-storage-api` |

```
byte-of-me/
├── apps/
│   └── web/                      # Next.js app (public site + dashboard)
│       ├── messages/             # next-intl locale JSON + generated .d.json.ts
│       └── src/
│           ├── app/
│           │   ├── [locale]/
│           │   │   ├── (public)/         # about · blogs/[slug] · contact · experience · projects
│           │   │   ├── (protected)/      # dashboard/* · space/* · print/* (admin only)
│           │   │   ├── (auth)/           # auth/login
│           │   │   └── [...rest]/        # 404 catch-all
│           │   ├── api/
│           │   │   ├── auth/[...nextauth]/
│           │   │   └── og/               # dynamic Open Graph images
│           │   ├── providers/            # theme, query client, analytics
│           │   ├── robots.ts · sitemap.ts
│           │   └── page.tsx              # `/` → `/en`
│           ├── widgets/          # auth · dashboard · public
│           ├── features/         # auth · dashboard · public
│           ├── entities/         # blog, comment, company, contact-message, education,
│           │                     # media, note, project, social-link, tag,
│           │                     # tech-stack, user-profile
│           └── shared/           # api · config · hooks · i18n · lib · types · ui
├── packages/
│   ├── ui/                       # Shared component & design system (@byte-of-me/ui)
│   ├── db/                       # Prisma schema, migrations, seed, client (@byte-of-me/db)
│   ├── storage/                  # S3-compatible storage client (@byte-of-me/storage)
│   ├── logger/                   # Structured logging (@byte-of-me/logger)
│   └── config/                   # Shared TypeScript presets (@byte-of-me/config)
├── docs/
│   ├── architecture.md           # System diagrams (Mermaid)
│   └── *.png                     # Screenshots
├── scripts/check.sh              # Full verification suite
└── docker-compose.yml            # Local PostgreSQL 16
```

Workspace packages are consumed as **TypeScript source** through Next.js `transpilePackages` — no build step is required before `bun run dev`.

---

## Authentication & access control

- **Providers** — email magic link (SMTP), GitHub OAuth, Google OAuth. Sessions are JWT; users are persisted through the Prisma adapter.
- **Roles** — every user is `USER` or `ADMIN`; the role is resolved from the database and carried on the token.
- **Two layers of protection**, both server-side:
  1. `app/[locale]/(protected)/layout.tsx` calls `getAuthenticatedAdmin()` and redirects to `/auth/login` for anyone else.
  2. Every admin server action and admin query calls `requireAdmin()` (see `shared/lib/auth/session.ts`), so a route guard alone is never the only defence.

There is no `middleware.ts` — the locale lives in the `[locale]` segment, `/` redirects to `/en`, and unmatched paths fall through to `[locale]/[...rest]` → `notFound()`.

---

## Getting started

> Requires **Node.js ≥ 20.9** (Next 16's floor; note `.nvmrc` pins v24.4.1), **Bun 1.3**, and a PostgreSQL 16 database (Supabase works out of the box; `docker-compose.yml` gives you a local one).

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp apps/web/.env.example  apps/web/.env      # app runtime config
cp packages/db/.env.example packages/db/.env  # DATABASE_URL / DIRECT_URL for the Prisma CLI

# 3. (Optional) Start a local PostgreSQL 16
docker compose up -d postgres
#   → postgresql://admin:secret@localhost:5432/byte_of_me

# 4. Apply migrations and generate the Prisma client
bun run --filter '@byte-of-me/db' db:migrate:dev
bun run generate

# 5. (Optional) Seed demo content
bun run --filter '@byte-of-me/db' db:seed
#   The seed prints AUTHOR_ID and always uses the same value. Every public
#   read is scoped to it, so apps/web/.env must carry that exact id or the
#   site renders empty with no error. The seed is idempotent: re-run freely.

# 6. Run the dev server
bun run dev         # http://localhost:3000  → redirects to /en
```

The dashboard lives at `/[locale]/dashboard` and requires an account whose `role` is `ADMIN`. The seed script creates one; otherwise sign in once and flip the role in the database.

---

## Environment variables

`apps/web/.env` is validated at startup by `@t3-oss/env-nextjs` (`src/shared/config/env.ts`) — a missing or malformed value fails the build rather than the request.

| Group | Variables |
| --- | --- |
| **App** | `NODE_ENV`, `NEXT_PUBLIC_ENV` |
| **Database** | `DATABASE_URL` (pooled, used by the app), `DIRECT_URL` (direct, used by migrations) |
| **Auth** | `AUTH_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET` |
| **Email (SMTP)** | `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` |
| **Storage** | `SUPABASE_S3_STORAGE_REGION`, `_ENDPOINT`, `_PUBLIC_ENDPOINT`, `_ACCESS_KEY`, `_SECRET_KEY`, `_BUCKET` |
| **Author / public** | `EMAIL`, `AUTHOR_ID` (UUID used to scope public content), `NEXT_PUBLIC_AUTHOR_EMAIL`, `NEXT_PUBLIC_GA_ID` |

`packages/db/.env` only needs `DATABASE_URL`, `DIRECT_URL`, and `NODE_ENV` — the Prisma CLI reads it through `packages/db/prisma.config.ts`.

Generate `AUTH_SECRET` with `openssl rand -base64 32`. Storage URLs are never hardcoded — always go through the helpers in `shared/api/s3-storage-api.ts`.

---

## Scripts

Run from the repo root (Turborepo fans each task out across the workspace):

| Command | Description |
| --- | --- |
| `bun run dev` | Start the app in development (Turbopack) |
| `bun run build` | Production build of every package |
| `bun run check` | Full gate: type-check → lint → test → build (`scripts/check.sh`) |
| `bun run check-types` | Type-check every package |
| `bun run lint` | Lint every package |
| `bun run lint:fix` | Lint and auto-fix |
| `bun run test` | Run the `bun test` suites |
| `bun run generate` | Regenerate the Prisma client (`@byte-of-me/db`) |

Package-scoped extras:

| Command | Description |
| --- | --- |
| `bun run --filter 'web' preview` | Production build, then `next start` |
| `bun run format` | Prettier over every workspace `src` |
| `bun run --filter '@byte-of-me/db' db:migrate:dev` | Create + apply a migration |
| `bun run --filter '@byte-of-me/db' db:migrate:deploy` | Apply pending migrations (CI/prod) |
| `cd packages/db && bunx prisma migrate reset --force` | Reset the database (destroys all data) |
| `bun run --filter '@byte-of-me/db' db:seed` | Seed demo content (idempotent) |
| `cd packages/db && bunx prisma studio --port 7777` | Browse the database |

Git hooks (Husky):

- **commit-msg** — commitlint (Conventional Commits).
- **pre-commit** — `turbo run check-types lint`.
- **pre-push** — `turbo run test build`.

---

## Database

The schema lives in `packages/db/prisma/schema.prisma` and covers auth (Auth.js tables), profile & social links, education & achievements, companies → roles → tasks, projects & co-authors, blogs, tags, media, comments, interactions, page views, contact messages, a generic `Translation` table, and the private notes graph (`Note`, `NoteLink`, `NoteLabel`, `NoteOnLabel`).

`Note` carries a generated `tsvector` column with a GIN index behind it, which is what full-text search reads; Prisma never writes that column.

Content models pair with a `*Translation` sibling (`BlogTranslation`, `ProjectTranslation`, `CompanyTranslation`, …) keyed by `language`, which is how dynamic content is localized.

The generated client is committed to `packages/db/src/generated/prisma` and re-exported from `@byte-of-me/db`. Prisma 7 connects through `@prisma/adapter-pg`, so there is no query-engine binary to ship — which is why `next.config.js` no longer needs the Prisma webpack plugin.

---

## Testing

`bun test` suites live next to the code they cover — **470 tests across 53 files**:

- `apps/web/src/entities/*/api/` — server-action contracts: owner scoping, narrow
  selects, cursor pagination, and the recursive delete-cascade count
- `apps/web/src/entities/note/model/` — tree walks, and a key-coverage spec that fails
  if a mutation stops invalidating a list the explorer renders
- `apps/web/src/features/**/lib/` — URL filter parsing, the explorer's pure geometry,
  the knowledge graph's viewport maths, and the `.md` frontmatter emitter
- `apps/web/src/widgets/notes/note-manager/` — the explorer's query contracts: a
  collapsed folder costs no query, a section header shows the aggregate count rather
  than the rows it loaded, and no view outside the trash ever reads the whole corpus
- `apps/web/src/shared/lib/` — `i18n-utils`, `pagination`, `rate-limit`, `reorder`,
  `validate-action-input`, `filter-params`, plus `i18n-parity` (fails if `en.json` and
  `vi.json` disagree on any key)
- `packages/ui/` — `sanitize`, `rich-text-content`, the render pipeline, and component
  rendering via `happy-dom` + `@testing-library/react`
- `packages/db` · `packages/storage` · `packages/logger` — client wiring

```bash
bun run test                    # everything
bun run --filter 'web' test     # a single workspace
```

Run tests through those scripts, not `bun test <path>` from the repo root: `bunfig.toml`
is resolved against the working directory, so running from the root skips each
workspace's preloads — including the guard that keeps tests off the production database.

---

## Deployment

Built for Vercel:

- `outputFileTracingRoot` points at the monorepo root so Bun's symlinked `node_modules` are traced correctly; `outputFileTracingExcludes` targets build-only packages (esbuild, typescript, prisma CLI) in Bun's `node_modules/.bun` store. Measured 2026-08-01: none of them are reachable from a server entry point, so file tracing never pulls them in and the excludes remove nothing today — they are correct, not load-bearing.
- Remote images are allowed only from the Supabase Storage host configured in `next.config.js`.
- Server actions accept bodies up to 3 MB (media uploads).
- Every variable in the **Environment variables** table is declared in `turbo.json` under `build.env` so Turborepo's cache key tracks it.

---

## Conventions

Start with [docs/architecture.md](docs/architecture.md) for how the system fits together, including a "where to change what" table.

The short version: respect the FSD boundaries, never mix the two translation systems, no `any` and no `@ts-ignore`, prefer Server Components, search before adding a utility, and don't add dependencies that aren't needed. Commits follow Conventional Commits, enforced by commitlint.

Per-package notes: [`packages/db`](packages/db/README.md) · [`packages/ui`](packages/ui/README.md) · [`packages/storage`](packages/storage/README.md) · [`packages/logger`](packages/logger/README.md) · [`packages/config`](packages/config/README.md)

---

## Author

**Phu Luong Thanh Hoang** ([@lthphuw](https://github.com/lthphuw))
[phu-lth.space](https://phu-lth.space/) · lthphuw@gmail.com

## License

Released under the terms in [LICENSE.md](LICENSE.md).
