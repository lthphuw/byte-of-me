# Architecture

How **Byte of Me** fits together, from the outside in. Five diagrams, each answering one question:

1. [System context](#1-system-context) — what runs where, and what we don't own
2. [Monorepo & package graph](#2-monorepo--package-graph) — which workspace depends on which
3. [Feature-Sliced Design](#3-feature-sliced-design-layers) — how `apps/web` is layered
4. [Request & trust flow](#4-request--trust-flow) — how a read differs from an admin write
5. [Two-layer i18n](#5-two-layer-internationalization) — where each kind of string lives

Then: [caching & invalidation](#caching--invalidation) and [where to change what](#where-to-change-what).

---

## Legend

Colour encodes **ownership**, not category — it answers "if this breaks, whose problem is it?"

| | Meaning |
| --- | --- |
| 🟦 **Indigo** | Application code we ship in the Next.js runtime |
| 🟩 **Teal** | Workspace packages (`packages/*`), consumed as TypeScript source |
| 🟧 **Amber** | Persistent state — Postgres tables, the storage bucket |
| 🟥 **Rose** | Trust boundary: something checks a role here |
| ⬛ **Slate** | Outside our deploy — browsers, managed services, OAuth providers |

Dashed borders mark a boundary we don't deploy across.

---

## 1. System context

```mermaid
flowchart TB
    V["Visitor browser<br/>en · vi"]
    A["Author browser<br/>role = ADMIN"]

    subgraph vercel["Vercel"]
        CDN["Edge cache"]

        subgraph next["Next.js 16 · App Router · Turbopack"]
            PUB["Public route group<br/>home · about · experience<br/>projects · blogs · contact"]
            PROT["Protected route group<br/>dashboard"]
            AUTHR["Auth.js route handler"]
            OG["OG image route<br/>Satori"]
            ACT["Server actions<br/>entities/*/api"]
        end
    end

    subgraph managed["Managed services"]
        PG[("PostgreSQL 16<br/>Supabase")]
        S3[("Object storage<br/>Supabase S3")]
        SMTP["SMTP relay"]
        GH["GitHub OAuth"]
        GO["Google OAuth"]
    end

    V --> CDN
    A --> CDN
    CDN -->|"cached 1h, SWR 24h"| PUB
    CDN -->|"no-store"| PROT

    PUB --> ACT
    PROT --> ACT
    ACT --> PG
    ACT --> S3
    ACT -->|"contact form"| SMTP

    PUB --> PG
    OG --> PG

    AUTHR --> GH
    AUTHR --> GO
    AUTHR -->|"magic link"| SMTP
    AUTHR --> PG

    V -.->|"reads images directly"| S3

    classDef app fill:#4338ca,stroke:#a5b4fc,color:#eef2ff
    classDef data fill:#b45309,stroke:#fcd34d,color:#fffbeb
    classDef ext fill:#475569,stroke:#94a3b8,color:#f8fafc

    class PUB,PROT,AUTHR,OG,ACT,CDN app
    class PG,S3 data
    class V,A,SMTP,GH,GO ext
```

**Notes**

- There is no `middleware.ts`. `/` redirects to `/en`; the locale is a route segment; unmatched paths fall through to a catch-all that calls `notFound()`.
- Cache policy is set per route group in `next.config.js` `headers()` — public gets `s-maxage=3600, stale-while-revalidate=86400`, anything under `dashboard` gets `no-store`.
- Uploads go **through** the server action (multipart → `PutObject`), so storage credentials never reach the browser. Reads bypass the app entirely: `next/image` is allowed to fetch from the Supabase host listed in `remotePatterns`.
- Prisma 7 talks to Postgres through `@prisma/adapter-pg` — a driver adapter, not a query-engine binary. That is why nothing here ships a native engine.

---

## 2. Monorepo & package graph

```mermaid
flowchart TB
    WEB["apps/web<br/>Next.js application"]

    UI["@byte-of-me/ui<br/>shadcn/ui · TipTap · motion"]
    DB["@byte-of-me/db<br/>Prisma schema · client · seed"]
    ST["@byte-of-me/storage<br/>S3-compatible client"]
    LOG["@byte-of-me/logger<br/>structured logging"]
    CFG["@byte-of-me/config<br/>TypeScript presets"]

    WEB --> UI
    WEB --> DB
    WEB --> ST
    WEB --> LOG
    DB --> LOG

    CFG -.->|"tsconfig extends"| WEB
    CFG -.->|"tsconfig extends"| DB
    CFG -.->|"tsconfig extends"| ST
    CFG -.->|"tsconfig extends"| LOG

    classDef app fill:#4338ca,stroke:#a5b4fc,color:#eef2ff
    classDef pkg fill:#0f766e,stroke:#5eead4,color:#f0fdfa

    class WEB app
    class UI,DB,ST,LOG,CFG pkg
```

Solid arrows are runtime dependencies; dashed arrows are build-time only — `@byte-of-me/config` ships no code, only `tsconfig` presets that each workspace extends by relative path.

Every package is consumed as **TypeScript source** via `transpilePackages`, so there is no build step before `bun run dev`. Turborepo still runs `build` for the packages that emit declarations (`db`, `storage`, `logger`) because `check-types` and `test` depend on `^build`.

`@byte-of-me/ui` uses **subpath exports** rather than one barrel — `./rich-text-editor`, `./rich-text`, `./lib/sanitize`. That is deliberate: importing the barrel from a public-site client component would drag all of TipTap into the visitor's bundle.

---

## 3. Feature-Sliced Design layers

`apps/web/src` is layered. A layer may import from the layers **below** it, never above and never sideways across slices.

```mermaid
flowchart TB
    APP["app/<br/>routes · layouts · providers · route handlers"]
    WID["widgets/<br/>composite page sections<br/>public-site-header · blog-details-content · blog-manager"]
    FEAT["features/<br/>user-facing capabilities<br/>blog-comment · blog-filters · blog-editor · media-library"]
    ENT["entities/<br/>domain models + their server API, client queries and UI<br/>blog · project · company · tag · media · comment"]
    SH["shared/<br/>api · config · hooks · i18n · lib · types · ui"]
    PKG["packages/*<br/>ui · db · storage · logger"]

    APP --> WID
    APP --> FEAT
    APP --> ENT
    WID --> FEAT
    WID --> ENT
    FEAT --> ENT
    ENT --> SH
    FEAT --> SH
    WID --> SH
    APP --> SH
    SH --> PKG

    ENT -.->|"✗ never — a lower layer may not reach upward"| FEAT

    classDef app fill:#4338ca,stroke:#a5b4fc,color:#eef2ff
    classDef pkg fill:#0f766e,stroke:#5eead4,color:#f0fdfa

    class APP,WID,FEAT,ENT,SH app
    class PKG pkg
```

The dashed edge is the rule worth stating out loud: an `entity` never imports a `feature`. If an entity seems to need one, the logic belongs in the entity, or the feature needs to pass it in.

Each slice exposes an `index.ts` barrel; cross-slice imports go through it rather than reaching into a file path.

Within `widgets/` and `features/`, slices are grouped by audience — `auth`, `dashboard`, `public` — which keeps the "never expose dashboard functionality to a public route" rule visible in the directory listing rather than buried in a guard.

---

## 4. Request & trust flow

Two paths through the same codebase. The difference is not the route — it's who checks the role.

```mermaid
sequenceDiagram
    autonumber
    actor U as Browser
    participant CDN as Vercel edge
    participant RSC as Server Component
    participant SA as Server action
    participant G as requireAdmin
    participant P as Prisma
    participant DB as PostgreSQL

    rect rgba(99, 102, 241, 0.14)
    Note over U,DB: Public read — cached, anonymous
    U->>CDN: GET /en/blogs/my-post
    CDN-->>U: hit — served from edge
    CDN->>RSC: miss — render
    RSC->>P: public query, scoped to AUTHOR_ID
    P->>DB: SQL via adapter-pg
    DB-->>RSC: rows + translations for locale
    RSC-->>CDN: HTML, cached 1h + SWR 24h
    end

    rect rgba(225, 29, 72, 0.14)
    Note over U,DB: Admin write — uncached, role-checked
    U->>SA: submit form (server action)
    SA->>G: requireAdmin()
    G->>DB: resolve role from session
    alt role is ADMIN
        G-->>SA: ok
        SA->>P: mutation
        P->>DB: SQL
        SA->>CDN: revalidateTag(CACHE_TAGS.BLOG)
        SA-->>U: ApiResponse success
    else anything else
        G-->>SA: throw Unauthorized
        SA-->>U: ApiResponse error
    end
    end
```

**Two independent guards, on purpose:**

```mermaid
flowchart LR
    R["Request to<br/>/en/dashboard/blogs"] --> L["(protected)/layout.tsx<br/>getAuthenticatedAdmin()"]
    L -->|"not admin"| RD["redirect → /auth/login"]
    L -->|"admin"| PAGE["Dashboard page"]
    PAGE --> ACT["Server action"]
    ACT --> RA["requireAdmin()<br/>runs again"]
    RA --> MUT["Mutation"]

    classDef app fill:#4338ca,stroke:#a5b4fc,color:#eef2ff
    classDef guard fill:#be123c,stroke:#fda4af,color:#fff1f2

    class R,PAGE,ACT,MUT,RD app
    class L,RA guard
```

The layout guard protects the *view*. It does not protect the *action* — server actions are addressable endpoints, callable without ever rendering the page. So every admin action and admin query calls `requireAdmin()` itself. The route guard is convenience; the action guard is the security boundary.

Auth.js issues JWT sessions. The role is read from the database on sign-in and carried on the token; providers are email magic link, GitHub, and Google.

---

## 5. Two-layer internationalization

Two translation systems that must never be mixed.

```mermaid
flowchart TB
    subgraph static["Static UI — compiled into the bundle"]
        JSON["messages/en.json<br/>messages/vi.json"]
        DTS["messages/*.d.json.ts<br/>generated declarations"]
        HOOK["useTranslations()<br/>getTranslations()"]
        JSON -->|"precompiled at build"| HOOK
        JSON -->|"key types"| DTS
        DTS -->|"unknown key fails tsc"| HOOK
    end

    subgraph dynamic["Dynamic content — rows in Postgres"]
        BASE[("Blog · Project · Company<br/>Education · Tag")]
        TR[("BlogTranslation · ProjectTranslation<br/>… keyed by language")]
        BASE --- TR
    end

    UITEXT["Buttons · labels · nav<br/>validation · dialogs"] --> static
    CONTENT["Post bodies · titles · summaries<br/>role descriptions · tag names"] --> dynamic

    DASH["Dashboard<br/>entity editors"] -->|"author edits each locale"| TR

    classDef app fill:#4338ca,stroke:#a5b4fc,color:#eef2ff
    classDef data fill:#b45309,stroke:#fcd34d,color:#fffbeb

    class HOOK,DTS,JSON,DASH,UITEXT,CONTENT app
    class BASE,TR data
```

The dividing line: **if a translator would need the running app to know what the string means, it's UI text** (next-intl). If it's something the author writes as content, it's a database translation. Never move content into locale JSON; never store UI strings in the database.

A third path used to exist — a `Translation` table whose rows were merged into the next-intl catalogue at request time — and it has been removed. It never worked (dot-path keys were never nested, and the query was unfiltered by locale), and it blurred the very line this section draws.

The client catalogue is scoped per route group rather than mounted once at the locale root: each group layout mounts `NextIntlClientProvider` with only the namespaces its **client** components read (see `src/shared/i18n/messages.ts`). Server components use `getTranslations` and never constrain those lists. Reads of `*Translation` rows are filtered to `[locale, 'en']` — see `getTranslationLanguages`.

Locales are `en` (default) and `vi`, declared once in `src/shared/i18n/routing.ts`.

---

## Caching & invalidation

Three layers, each invalidated differently:

| Layer | Scope | Invalidated by |
| --- | --- | --- |
| Vercel edge (`headers()`) | Public HTML, 1h + 24h SWR | Time, or a deploy |
| Next.js data cache | Tagged queries | `revalidateTag(CACHE_TAGS.X)` inside the mutating server action |
| TanStack Query | Client-side server state in the dashboard | Query invalidation after a mutation resolves |

`CACHE_TAGS` (`src/shared/lib/constants.ts`) is the single list of tags — `blog`, `project`, `company`, `education`, `media`, `tag`, `tech-stack`, `social-link`, `user-profile`, `comment`, `contact-message`. A mutation that forgets its tag is the usual cause of "I saved it but the public page is stale."

`purgeEntireCache()` in `src/shared/lib/revalidate.ts` is the blunt escape hatch — `revalidatePath('/', 'layout')`.

Blog view counts deliberately sit outside all of this: `trackBlogView` writes a `BlogStatisticLog` row guarded by a per-post cookie, and live stats are read uncached.

---

## Where to change what

| I want to… | Start here |
| --- | --- |
| Add a page | `apps/web/src/app/[locale]/(public)/` + a widget in `widgets/public/` |
| Add a dashboard section | `app/[locale]/(protected)/dashboard/` + `widgets/dashboard/` + `features/dashboard/` |
| Change what a domain model can do | `entities/<model>/api/` — one file per operation, each starting with a guard |
| Add a UI string | `apps/web/messages/en.json` **and** `vi.json` (types regenerate on build; `i18n-parity.spec.ts` fails if you touch only one) |
| Add a dashboard editor | A **separate by-id read** for the form — never reuse the list row. See below |
| Add a translatable content field | `packages/db/prisma/schema.prisma` → the `*Translation` model → migration |
| Add a shared component | `packages/ui/src/` + an entry in `exports` if it should be deep-imported |
| Change cache behaviour | `next.config.js` `headers()` for edge, `CACHE_TAGS` for data |
| Change who can do something | `src/shared/lib/auth/session.ts` |

---

## List reads and edit reads are separate

A dashboard manager renders a list; clicking Edit opens a dialog. The tempting shortcut is
to hand the list row straight to the dialog as `initialData` — and blogs did exactly that,
which forced the list query to carry every post's full TipTap body (20 posts × 2 locales)
so the editor would have something to open.

That coupling is worse than the wasted bytes: narrowing the list query then empties the
editor, and the next Save writes that emptiness over a published post.

```mermaid
flowchart LR
    subgraph before["Before — one read, two jobs"]
        L1["getPaginatedAdminBlogs<br/>full content ×20 ×2 locales"] --> C1["Blog cards"]
        L1 --> D1["Editor dialog"]
    end

    subgraph after["After — one read per job"]
        L2["getPaginatedAdminBlogs<br/>id · language · title · description"] --> C2["Blog cards"]
        E2["getAdminBlogById<br/>full record, on open"] --> D2["Editor dialog"]
    end

    classDef app fill:#4338ca,stroke:#a5b4fc,color:#eef2ff
    classDef guard fill:#be123c,stroke:#fda4af,color:#fff1f2
    class L1,C1,D1,L2,C2,C2,E2 app
    class D2 guard
```

The dialog is a trust boundary of its own: it must not mount the form until the full record
has arrived. The guard is `Boolean(editing) && !fullRecord` — one condition covering
loading, fetch failure **and** idle, because any of the three leaves the form holding a
partial row.

`project`, `tag`, `company` and `user-profile` still reuse their list rows. Their
translatable fields are short, so today it is only wasted bytes — but the failure mode is
identical the moment one of them grows.

---

*Diagrams render natively on GitHub. Edit this file rather than exporting images — the source of truth should diff.*
