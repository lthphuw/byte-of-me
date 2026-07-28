<div align="center">

# Byte of Me

**A multilingual portfolio & headless CMS — logged one byte at a time.**

A production personal website with a polished public portfolio and a private, multilingual content dashboard. Built as a TypeScript monorepo on Next.js 16 and the App Router.

[**🌐 Live — phu-lth.space**](https://phu-lth.space/)

<br />

<img src="https://img.shields.io/badge/Next.js_16-000000?logo=next.js&logoColor=white&style=flat-square" alt="Next.js" />
<img src="https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB&style=flat-square" alt="React" />
<img src="https://img.shields.io/badge/TypeScript_5.8-3178C6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript" />
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white&style=flat-square" alt="Tailwind CSS" />
<img src="https://img.shields.io/badge/shadcn/ui-000000?logo=shadcnui&logoColor=fff&style=flat-square" alt="shadcn/ui" />
<br />
<img src="https://img.shields.io/badge/Prisma_7-2D3748?logo=prisma&logoColor=white&style=flat-square" alt="Prisma" />
<img src="https://img.shields.io/badge/PostgreSQL_16-4169E1?logo=postgresql&logoColor=white&style=flat-square" alt="PostgreSQL" />
<img src="https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff&style=flat-square" alt="Supabase" />
<img src="https://img.shields.io/badge/TanStack_Query-FF4154?logo=react-query&logoColor=fff&style=flat-square" alt="TanStack Query" />
<img src="https://img.shields.io/badge/Auth.js_v5-000000?logo=nextdotjs&logoColor=white&style=flat-square" alt="Auth.js" />
<br />
<img src="https://img.shields.io/badge/next--intl_4-EC4899?logoColor=white&style=flat-square" alt="next-intl" />
<img src="https://img.shields.io/badge/TipTap_3-000000?logo=tiptap&logoColor=white&style=flat-square" alt="TipTap" />
<img src="https://img.shields.io/badge/Framer_Motion-0055FF?logo=framer&logoColor=white&style=flat-square" alt="Framer Motion" />
<img src="https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white&style=flat-square" alt="Turborepo" />
<img src="https://img.shields.io/badge/pnpm_10-F69220?logo=pnpm&logoColor=white&style=flat-square" alt="pnpm" />

</div>

---

## Overview

**Byte of Me** is a personal portfolio that doubles as its own content platform. Visitors get a fast, animated, fully bilingual (English / Tiếng Việt) site; the owner gets a private dashboard to write blog posts, manage projects and work history, and translate everything — without touching code or redeploying.

The whole thing is a single TypeScript monorepo, organized with [Feature-Sliced Design](https://feature-sliced.design/) on the frontend and shared workspace packages for the database, storage, logging, UI kit, and tooling config.

<div align="center">
  <img src="docs/pub1.png" alt="Byte of Me — public portfolio" width="80%" />
</div>

---

## Highlights

### 🎨 Public portfolio
- **Home, About, Experience, Projects, Blogs, Contact** — server-rendered, SEO-friendly, and richly animated with Framer Motion.
- **Full-featured blog** — cover hero, author byline, breadcrumb, table of contents, reading-progress bar, related posts, related project, prev/next navigation, and per-post **likes, claps, and threaded comments**.
- **Filterable, paginated** project and blog listings with shareable, URL-based filters.
- **A vertical experience timeline** rendered from live CMS data (companies → roles → tasks).
- **Contact form** that persists the message and delivers it over SMTP (Nodemailer).
- **SEO & sharing built in** — dynamic OG images (`/api/og`, Satori), `sitemap.ts`, `robots.ts`, PWA `manifest.ts`, per-route metadata.

### 🔐 Private CMS dashboard
- Manage **blogs, projects, companies & roles, education, tags, tech stacks, media, comments, social links, user profile, and translations** from one place.
- **Analytics** — dashboard stats plus a per-blog analytics overview backed by page-view and interaction logs.
- **Comment moderation** — hide/show any comment on any post.
- **Rich-text editor** (TipTap 3) with code blocks (lowlight), images, tables, typography, text align/color/highlight, and a table-of-contents extension.
- **Media library** backed by S3-compatible object storage (Supabase Storage).
- Protected by **Auth.js v5** — magic-link email, GitHub, and Google sign-in, with `ADMIN`/`USER` roles.

### 🌍 Two-layer internationalization
- **Static UI** strings (buttons, labels, nav, validation) via **next-intl** locale files, precompiled at build time with generated TypeScript declarations (`messages/en.d.json.ts`) so message keys are type-checked.
- **Dynamic content** (blogs, projects, experience, education, tags…) translated and stored **in PostgreSQL** via per-model `*Translation` tables, editable from the dashboard.
- Locales: `en` (default) and `vi`, carried in the `[locale]` route segment.

> These two systems are never mixed — UI strings never live in the database, and content never lives in locale JSON.

### ⚡ Engineered for quality
- **Feature-Sliced Design** architecture with clear `app → widgets → features → entities → shared` boundaries.
- **Server Components first**; server actions for mutations, TanStack Query for client-side server state.
- **Bundle discipline** — subpath exports keep TipTap out of public-site JS; `optimizePackageImports` deep-imports the barrel packages (`lucide-react`, `react-icons`, `date-fns`, `framer-motion`, …).
- **Edge caching by route group** — public pages get `s-maxage=3600, stale-while-revalidate=86400`; every dashboard route is `no-store`.
- **Turborepo + pnpm** workspace with shared, independently-typed packages and a full `type-check → lint → test → build` gate.

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
| **Editor** | TipTap 3 + lowlight/highlight.js |
| **Email** | Nodemailer (SMTP) — sign-in links and contact-form delivery |
| **Forms & validation** | React Hook Form + Zod; env parsed with `@t3-oss/env-nextjs` |
| **Analytics** | Vercel Analytics & Speed Insights, Google Analytics (`@next/third-parties`), plus first-party page-view/interaction logging |
| **Testing** | Jest + ts-jest |
| **Tooling** | Turborepo, pnpm workspaces, ESLint 9 (flat config), Prettier, Husky + commitlint |

---

## Architecture

> 📐 **[docs/architecture.md](docs/architecture.md)** has the full picture as diagrams — system context, package graph, FSD layers, request & trust flow, and the two-layer i18n model.

The frontend follows **Feature-Sliced Design** — each layer may only depend on the layers below it, keeping features isolated and reusable:

| Layer | Responsibility | Examples |
| --- | --- | --- |
| `app/` | App Router routes, layouts, providers, route handlers | `(public)`, `(protected)/dashboard`, `(auth)`, `api/og` |
| `widgets/` | Composite page sections | `public-site-header`, `blog-details-content`, `blog-manager` |
| `features/` | User-facing capabilities | `blog-comment`, `blog-filters`, `blog-editor`, `media-library` |
| `entities/` | Domain models with their server API + UI | `blog`, `project`, `company`, `tag`, `translation` |
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
│           │   │   ├── (protected)/      # dashboard/* (admin only)
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
│           │                     # media, project, social-link, tag, tech-stack,
│           │                     # translation, user-profile
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

Workspace packages are consumed as **TypeScript source** through Next.js `transpilePackages` — no build step is required before `pnpm dev`.

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

> Requires **Node.js ≥ 20.9** (Next 16's floor; note `.nvmrc` pins v24.4.1), **pnpm 10**, and a PostgreSQL 16 database (Supabase works out of the box; `docker-compose.yml` gives you a local one).

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp apps/web/.env.example  apps/web/.env      # app runtime config
cp packages/db/.env.example packages/db/.env  # DATABASE_URL / DIRECT_URL for the Prisma CLI

# 3. (Optional) Start a local PostgreSQL 16
docker compose up -d postgres
#   → postgresql://admin:secret@localhost:5432/byte_of_me

# 4. Apply migrations and generate the Prisma client
pnpm --filter @byte-of-me/db db:migrate:dev
pnpm generate

# 5. (Optional) Seed demo content
pnpm --filter @byte-of-me/db db:seed
#   The seed prints AUTHOR_ID and always uses the same value. Every public
#   read is scoped to it, so apps/web/.env must carry that exact id or the
#   site renders empty with no error. The seed is idempotent: re-run freely.

# 6. Run the dev server
pnpm dev            # http://localhost:3000  → redirects to /en
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
| `pnpm dev` | Start the app in development (Turbopack) |
| `pnpm build` | Production build of every package |
| `pnpm check` | Full gate: type-check → lint → test → build (`scripts/check.sh`) |
| `pnpm check-types` | Type-check every package |
| `pnpm lint` | Lint every package |
| `pnpm lint:fix` | Lint and auto-fix |
| `pnpm test` | Run the Jest suites |
| `pnpm generate` | Regenerate the Prisma client (`@byte-of-me/db`) |

Package-scoped extras:

| Command | Description |
| --- | --- |
| `pnpm --filter web preview` | Production build, then `next start` |
| `pnpm format` | Prettier over every workspace `src` |
| `pnpm --filter @byte-of-me/db db:migrate:dev` | Create + apply a migration |
| `pnpm --filter @byte-of-me/db db:migrate:deploy` | Apply pending migrations (CI/prod) |
| `pnpm --filter @byte-of-me/db exec prisma migrate reset --force` | Reset the database (destroys all data) |
| `pnpm --filter @byte-of-me/db db:seed` | Seed demo content (idempotent) |
| `pnpm --filter @byte-of-me/db exec prisma studio --port 7777` | Browse the database |

Git hooks (Husky):

- **commit-msg** — commitlint (Conventional Commits).
- **pre-commit** — `turbo run check-types lint`.
- **pre-push** — `turbo run build`.

---

## Database

The schema lives in `packages/db/prisma/schema.prisma` and covers auth (Auth.js tables), profile & social links, education & achievements, companies → roles → tasks, projects & co-authors, blogs, tags, media, comments, interactions, page views, contact messages, and a generic `Translation` table.

Content models pair with a `*Translation` sibling (`BlogTranslation`, `ProjectTranslation`, `CompanyTranslation`, …) keyed by `language`, which is how dynamic content is localized.

The generated client is committed to `packages/db/src/generated/prisma` and re-exported from `@byte-of-me/db`. Prisma 7 connects through `@prisma/adapter-pg`, so there is no query-engine binary to ship — which is why `next.config.js` no longer needs the Prisma webpack plugin.

---

## Testing

Jest (ts-jest) unit suites live next to the code they cover:

- `apps/web/src/shared/lib/` — `deep-merge`, `i18n-utils`, `pagination`, `reorder`
- `packages/ui/src/lib/` — `sanitize`, `rich-text-content`
- `packages/db/__tests__/` — Prisma client wiring
- `packages/storage/__tests__/` — storage client

```bash
pnpm test                       # everything
pnpm --filter web test          # a single workspace
```

---

## Deployment

Built for Vercel:

- `outputFileTracingRoot` points at the monorepo root so pnpm's symlinked `node_modules` are traced correctly; `outputFileTracingExcludes` drops build-only weight (swc, esbuild, typescript, prisma CLI) from the serverless bundles.
- Remote images are allowed only from the Supabase Storage host configured in `next.config.js`.
- Server actions accept bodies up to 3 MB (media uploads).
- Every variable in the **Environment variables** table is declared in `turbo.json` under `build.env` so Turborepo's cache key tracks it.

---

## Conventions

Start with [docs/architecture.md](docs/architecture.md) for how the system fits together, including a "where to change what" table.

Project-wide rules for contributors (and AI assistants) are documented in [CLAUDE.md](CLAUDE.md) — the short version: respect the FSD boundaries, never mix the two translation systems, no `any` and no `@ts-ignore`, prefer Server Components, search before adding a utility, and don't add dependencies that aren't needed.

Per-package notes: [`packages/db`](packages/db/README.md) · [`packages/ui`](packages/ui/README.md) · [`packages/storage`](packages/storage/README.md) · [`packages/logger`](packages/logger/README.md) · [`packages/config`](packages/config/README.md)

---

## Author

**Phu Luong Thanh Hoang** ([@lthphuw](https://github.com/lthphuw))
🌐 [phu-lth.space](https://phu-lth.space/) · ✉️ lthphuw@gmail.com

## License

Released under the terms in [LICENSE.md](LICENSE.md).
