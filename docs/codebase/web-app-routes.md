# Web app routes

> Route tree, layout guards, route handlers, metadata routes and the `headers()` Cache-Control rules for `apps/web`. Source: `apps/web/src/app`, `apps/web/next.config.js`, `apps/web/src/proxy.ts`, `apps/web/src/app/globals.css`.

## Layout

```text
apps/web/src/
  proxy.ts                          next-intl negotiation; stamps x-pathname; reads no session
  app/
    layout.tsx, page.tsx            passthrough + globals.css; page.tsx redirects / to /en
    not-found.tsx, global-error.tsx root 404 and last-resort boundary (both client)
    globals.css                     34 tokens, e.g. --background --foreground --card --muted --primary --border --input --ring; plus --brand-50..--brand-950, --radius
    providers/                      GlobalProvider: Query, Motion, Theme, Toaster, GA, SpeedInsights
    robots.ts, sitemap.ts           metadata routes -> /robots.txt, /sitemap.xml
    feed.xml/route.ts               route handler -> /feed.xml (RSS 2.0)
    llms.txt/route.ts               route handler -> /llms.txt (plain-text index for AI assistants)
    api/auth/[...nextauth]/         route handler -> NextAuth GET, POST
    api/og/route.tsx                route handler -> /api/og (1200x630 PNG)
    [locale]/
      layout.tsx                    html/body, locale guard, SessionProvider, JSON-LD, Analytics
      error.tsx, not-found.tsx      locale-aware error boundary and 404
      [...rest]/page.tsx            notFound()
      (public)/                     force-static; header + footer
        page.tsx -> HomepageContent     blogs/ -> BlogsContent     projects/ -> ProjectsContent
        contact/ -> ContactContent      blogs/[slug]/ -> BlogDetailsContent     experience/ -> redirect('/') (behind a 308 in next.config.js)
      (auth)/auth/login -> AdminAuthLogInView     force-dynamic; admin -> /dashboard
      (print)/print/blogs/[slug] -> BlogPrintTrigger + PrintableDocument     public, no shell
      (protected)/                  force-dynamic; admin guard on the view
        dashboard/layout.tsx        DashboardSidebar, WorkspaceSettingsProvider, dashboard messages
        dashboard/page.tsx          features/dashboard + ContactMessageGallery
        dashboard/<x>/page.tsx      <X>Manager: blogs comments companies educations featured-works media projects tags tech-stacks user-profile
```

## Key flows

- **Request**: `apps/web/src/proxy.ts:14-22` stamps `x-pathname` (`apps/web/src/shared/lib/constants.ts:70`), then runs next-intl. The matcher (`:25`) skips `api`, `trpc`, `_next`, `_vercel` and dotted paths.
- **Locale root**: `apps/web/src/app/[locale]/layout.tsx:145-193` calls `notFound()` for an unknown locale and mounts only the `error` namespace (`apps/web/src/shared/i18n/messages.ts:21`). Public, auth, print and dashboard layouts mount their own messages.
- **Admin view guard**: `apps/web/src/app/[locale]/(protected)/layout.tsx:23-40` calls `getAuthenticatedAdmin()`, else redirects to `/auth/login` with `from` = `x-pathname`. The nested dashboard layout has no guard of its own; server actions guard separately (AGENTS §5).
- **Login**: `apps/web/src/app/[locale]/(auth)/layout.tsx:16-20` sends a signed-in admin to `/dashboard`.
- **Redirects**: `apps/web/next.config.js:192-220`: `/about` to `/`, `/:locale(en|vi)/about` to `/:locale`, and `/experience` to `/` in both forms, all permanent.
- **Route handlers**: `apps/web/src/app/api/og/route.tsx:47-178` takes `?title` (max 80) and `?subtitle` (max 90), reads Cal Sans with `readFile`, sets its own `Cache-Control` on success (`:167`), returns 500 text on failure. `apps/web/src/app/api/auth/[...nextauth]/route.ts:3` exports `GET`, `POST` from `handlers`. `apps/web/src/app/feed.xml/route.ts` is RSS for the default locale only, `revalidate = 3600` (`:8`).
- **Metadata routes**: `apps/web/src/app/robots.ts` allows `/api/og`, disallows `/dashboard`, `/en/dashboard`, `/vi/dashboard` and `/api/` (`:7-19`). `apps/web/src/app/sitemap.ts` lists `sitemapConfig` keys plus every published post (`getPublishedBlogs`), in every locale. A post's `lastmod` is its `updatedAt`; static pages carry none. Each URL lists `x-default` beside `en` and `vi`. `apps/web/src/app/llms.txt/route.ts` serves `/llms.txt`: the homepage, the list pages and every published post with its summary, English only, `revalidate = 3600`.
- **Edge caching**: `apps/web/next.config.js:221-291` `headers()`, in the match order below. It reaches static and ISR output only; function responses set their own (see `/api/og` below).

**Cache-Control rules, match order** (`apps/web/next.config.js`)

| # | Source (line) | Cache-Control or headers | Matches |
| --- | --- | --- | --- |
| 1 | `/((?!api\|_next\|.*dashboard).*)/:path*` (`:241`) | `public, s-maxage=3600, stale-while-revalidate=86400` | public pages, `/en/print/*`, `/feed.xml`, `/robots.txt`, `/sitemap.xml`, `/site.webmanifest`; not `api`, `_next`, or any path containing `dashboard` |
| 2 | `/:locale/dashboard/:path*` (`:252`) | `private, no-cache, no-store, max-age=0, must-revalidate` | `/<locale>/dashboard/*` |
| 3 | `/:locale/auth/:path*` (`:263`) | `private, no-store` | `/<locale>/auth/*`; overrides rule 1 |
| 4 | `/:path*` (`:272`) | no Cache-Control: nosniff, Referrer-Policy, Permissions-Policy, HSTS | everything |
| 5 | `/:locale/dashboard/:path*` (`:288`) | no Cache-Control: `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'` | dashboard |
| 6 | `/:locale/auth/:path*` (`:289`) | as rule 5 | auth |

There is no `/api` rule. `/api/og` sets its own `Cache-Control` (`apps/web/src/app/api/og/route.tsx:167`). Auth.js sets `private, no-cache, no-store` on `/api/auth/*` (`@auth/core` `lib/actions/session.js:11`). Locally rule 3 also matches `/api/auth/*`, because `:locale` takes any segment, so `next start` shows `private, no-store` there. Production shows Auth.js's own value.

## Recipes

1. **Public page** (model folder: `apps/web/src/app/[locale]/(public)/contact/`)
   1. Copy its `page.tsx` (`generateStaticParams`, `setRequestLocale`, one widget) and `layout.tsx` (`buildPublicPageMetadata`) to `apps/web/src/app/[locale]/(public)/<name>/`.
   2. Copy its `loading.tsx`; the skeleton reuses the widget's classes (AGENTS §14).
   3. Widget in `apps/web/src/widgets/public/<name>-content/`, exported from `apps/web/src/widgets/public/index.ts`.
   4. New namespace: add to `PUBLIC_MESSAGE_NAMESPACES` (`apps/web/src/shared/i18n/messages.ts:26`); strings go in both `apps/web/messages/en.json` and `apps/web/messages/vi.json`.
   5. If it should be indexed, add it to `sitemapConfig` in `apps/web/src/shared/config/sitemap.ts`.
2. **Dashboard page** (model folder: `apps/web/src/app/[locale]/(protected)/dashboard/tags/`)
   1. Copy its `page.tsx` (`prefetchAdminPage` + `HydrationBoundary` + noindex `metadata`) and `loading.tsx` to `apps/web/src/app/[locale]/(protected)/dashboard/<name>/`.
   2. Widget `apps/web/src/widgets/dashboard/<name>-manager/` (`index.ts` + `ui/`), modelled on `apps/web/src/widgets/dashboard/tag-manager/`.
   3. Nav link in `apps/web/src/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups.ts`.
   4. New namespace: add to `DASHBOARD_MESSAGE_NAMESPACES` (`apps/web/src/shared/i18n/messages.ts:52`).
   5. Every admin action and query calls `requireAdmin()` itself (AGENTS §5).
3. **Cache rule change** in `apps/web/next.config.js`
   1. Edit the `headers()` array (`:208-300`).
   2. Add a narrower rule after rule 1. For each header key the last matching rule wins (`apps/web/node_modules/next/dist/server/lib/router-utils/resolve-routes.js:543-564`).
   3. Verify: `cd apps/web && bun run preview`, then `curl -sI http://localhost:3000/<path>` from a second shell.

## Gotchas

- Rule 1 excludes any path containing `dashboard`, not only a segment. `/en/blogs/dashboard-tips` gets no public rule and falls back to Next's own default (`s-maxage=31536000` when static; `apps/web/node_modules/next/dist/server/lib/cache-control.js:19`).
- `next dev` replaces every HTML response's Cache-Control with `no-cache, must-revalidate` (`apps/web/node_modules/next/dist/server/base-server.js:1106-1108`). Check headers only on `bun run preview`.
- `/api/og` sets its own `Cache-Control` in `apps/web/src/app/api/og/route.tsx:167`. Production does not apply `headers()` to function responses: on `phu-lth.space`, `/api/og` answered `public, max-age=0, must-revalidate` (the `ImageResponse` default, `apps/web/node_modules/next/dist/server/og/image-response.js:58`) and `/api/auth/session` answered Auth.js's own `private, no-cache, no-store`, while `next start` showed the configured values. Locally a routing header overrides the route's (`apps/web/node_modules/next/dist/server/send-response.js:46-52`), which hid the difference. A header set in the route is what both environments serve.
- `/en/experience` is a permanent 308 to `/` from `apps/web/next.config.js`, so `experience/page.tsx` and its `loading.tsx` run only once that rule is removed. It is absent from `apps/web/src/shared/config/sitemap.ts:14-18`. `experience/layout.tsx` keeps `noindex` for the case where the rule is removed before the page returns.
- The proxy matcher skips dotted paths (`apps/web/src/proxy.ts:25`), so `/feed.xml`, `/robots.txt` and `/sitemap.xml` never get a locale prefix.
- `apps/web/src/app/not-found.tsx:16`: the `;` after `<Error statusCode={404} />` renders as visible text on the root 404.

## Run

```bash
cd apps/web
bun run dev        # next dev --turbopack (hides headers(), see Gotchas)
bun run build      # next build --turbopack
bun run preview    # build, then next start (blocks; curl from a second shell)
```

## AGENTS.md deviations

- `AGENTS.md:206` (§6) says Next serves dynamic routes `private, no-store` by default. Next 16.3.8 sends `private, no-cache, no-store, max-age=0, must-revalidate` for `revalidate: 0` (`apps/web/node_modules/next/dist/server/lib/cache-control.js:15`; `apps/web/node_modules/next/dist/server/app-render/app-render.js:1868`). Bare `private, no-store` only appears in the adapter's PPR data headers, with more directives (`apps/web/node_modules/next/dist/build/adapter/build-complete.js:772`).
- `AGENTS.md:181` (§6) scopes the public rule to "Public HTML". Rule 1 also matches `/feed.xml`, `/robots.txt`, `/sitemap.xml` and `/site.webmanifest` (`apps/web/next.config.js:228`).
- `AGENTS.md:225` and `:245` (§7) say `@byte-of-me/ui` has no barrel and that `next.config.js` holds a barrel list. `packages/ui/package.json` exports `"."` (`./src/index.ts`), and `apps/web/next.config.js:119` says the list was removed.
- `apps/web/src/app/providers/global-provider.tsx:4` (§7): a `'use client'` provider mounted on every page imports the `@byte-of-me/ui` root barrel; §7 says client entry points use subpaths.
- `AGENTS.md:110` (§3): 13 deep `@/entities/<slice>/api/...` and 8 deep `@/widgets/<group>/<slice>/...` imports in `apps/web/src/app` (e.g. `apps/web/src/app/sitemap.ts:5`, `apps/web/src/app/[locale]/(protected)/dashboard/companies/page.tsx:4`). `apps/web/src/app/[locale]/(protected)/dashboard/layout.tsx:43-45` is the only stated reason; §3 has no carve-out.
- `AGENTS.md:442` (§11.14): comment blocks far over three lines: `apps/web/next.config.js:119-140` (22 lines), `:12-29` (18), `apps/web/src/app/[locale]/(print)/layout.tsx:10-32` (23).
- `AGENTS.md:133` (§4): fixed UI text belongs in next-intl, but `apps/web/src/app/[locale]/(protected)/dashboard/tags/page.tsx:13-14` and `apps/web/src/app/[locale]/(auth)/auth/login/page.tsx:6` hardcode English titles.

## See also

- [web-widgets.md](web-widgets.md): the widgets pages render.
- [web-features.md](web-features.md): `features/public/blog-print`, `features/dashboard`.
- [web-entities-content.md](web-entities-content.md): blog, project and open-source APIs used by pages, sitemap and feed.
- [web-shared.md](web-shared.md): `shared/i18n`, `shared/lib/auth`, `shared/lib/metadata`, `shared/config`.
- [packages-ui.md](packages-ui.md): `@byte-of-me/ui` barrel and subpath exports.
- [../architecture.md](../architecture.md): diagrams.
