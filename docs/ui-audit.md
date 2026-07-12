# UI Audit — Components & Usage

> Generated 2026-07-11 by a four-track review (public site, dashboard, component
> library, cross-cutting patterns). Every finding was verified against the code
> and cites `file:line`. Paths: `W` = `apps/web/src`, `UI` = `packages/ui/src`.
> Audited immediately after the `@byte-of-me/ui` extraction — all paths current.

---

## 1. Broken behavior (fix first — these are bugs, not style)

| # | Where | What |
|---|---|---|
| B1 | `W/features/dashboard/media-library/ui/image-upload.tsx` + ~20 call sites | **Most dashboard toasts never render.** The app mounts only the sonner `<Toaster>` (`W/app/providers/global-provider.tsx:33`), but ~20 files call `useToast()`/`toast` from `@byte-of-me/ui` — a shadcn/radix store with **no renderer mounted anywhere** (nothing consumes `ToastViewport`). Save/delete/upload/clear-cache feedback across education, tech-stack, media, sidebar is a silent no-op. Only tag-manager (sonner) actually shows toasts. **Fix:** migrate all `useToast` call sites to sonner, delete `UI/toast.tsx` + `UI/hooks/use-toast.ts`. |
| B2 | `W/entities/blog/api/get-paginated-public-blogs.ts:81-83` | Related project mapped with the **blog's** `id`/`slug` instead of `blog.project.id/.slug`. Consumers linking to the project get blog ids. (Flagged in Refactor 1; confirmed independently by the audit.) |
| B3 | `W/features/dashboard/blog-editor/ui/form/blog-form.tsx:100-101` + `blog-manager.tsx:117-132` | **Stale form on "New Blog":** reset effect early-returns when `initialData` is null and the dialog is never remounted (no `key=`). Edit blog A → close → New Blog shows A's data; can overwrite-as-create. Also `initialData={editing!}` lies to a non-nullable prop. |
| B4 | `UI/rich-text-editor/tiptap/extensions/use-image-upload.ts:16-37` | **Demo scaffolding in production:** `dummyUpload` adds a fake 1.5 s delay and throws `'Upload failed - This is a demo error'` 20 % of the time (`Math.random()`), and returns the local blob URL. On image **replace**, `uploadedRef` is already true so the blob is never re-uploaded — the saved doc keeps a `blob:` URL that dies on reload. |
| B5 | `W/widgets/public/blog-details-content/ui/blog-comment-share-actions.tsx:15-16` | `navigator.share()` without feature detection — throws on desktop Firefox/older browsers. Guard + clipboard fallback. |
| B6 | `UI/lib/sanitize.ts:10-16` → `UI/rich-text.tsx:107` | **XSS-weak sanitizer feeding `dangerouslySetInnerHTML`:** regex only strips *quoted* event handlers; unquoted `onerror=alert(1)`, `data:` URIs, `style` pass through. Replace with DOMPurify (needs your dependency approval) or sanitize server-side. |
| B7 | `W/entities/comment/ui/comment-list.tsx:71-79` | Replying to a reply shows/posts "Replying to @<root author>" instead of the reply's author. |
| B8 | `W/widgets/dashboard/education-manager/ui/education-achievement-item-field.tsx:163-171` | Button labeled "Remove Achievement Translation" deletes the **entire achievement** (`remove(index)`); `removeTranslation` is never wired to any button. |
| B9 | `W/entities/media/ui/media-card.tsx:61-68` + `media-manager.tsx:68` | Media delete is one-click permanent — no confirmation, unlike every other manager. |
| B10 | `W/features/dashboard/blog-editor/ui/form/blog-form.tsx:123,131` | Fallback content is the JSX element `<p></p>` where the string `'<p></p>'` is expected (line 87 does it right) — empty translations feed a React element into the editor/`JSON.stringify`. |
| B11 | `W/widgets/public/blog-details-content/ui/blog-content-header.tsx:12` | `className={'w-fullç'}` — typo; `w-full` never applies. |
| B12 | `W/features/public/about-tech-stack/ui/about-tech-stack-loading.tsx:45` | `Math.random()` in a server-rendered Suspense fallback → hydration mismatch. Use a fixed array (widths already derive from indices). |
| B13 | `W/features/dashboard/media-library/ui/image-upload.tsx:50-51` + `media-manager.tsx:48-52` | Upload success toast fires before the request finishes (`upload.mutate` fire-and-forget); errors never surface. `media-select.tsx:95-98` shows the correct `await mutateAsync` pattern. |
| B14 | `W/widgets/dashboard/tag-manager/ui/tag-manager.tsx:77`, `tech-stack-manager.tsx:60` | Missing React `key` on mapped cards — state swaps after delete/reorder. |
| B15 | `UI/rich-text-editor/tiptap/rich-text-editor.tsx:105` | TOC sidebar reads `item.active` but tiptap provides `isActive` — active-heading highlight never fires (kept as-is during typing cleanup to preserve behavior; it's a real latent bug). |
| B16 | `W/entities/education/ui/achievement-images.tsx` | Pre-cleanup, thumbnail clicks threw `TypeError` (`onOpenGallery` never passed). Now a typed optional no-op — decide the intended behavior (open gallery?) and wire it. |

## 2. Mobile & accessibility (public site)

- **A1 — Filter badges are `<div onClick>`** (`UI/badge.tsx:31`, `W/entities/tag/ui/tag-clickable-badge.tsx:16-25`, `tech-stack-clickable-badge.tsx:20-27`): no keyboard focus/activation, no role — blog/project filtering is mouse-only. Render as `<button>` with `aria-pressed`.
- **A2 — Locale-losing links**: `blog-card.tsx` and `homepage-recent-projects.tsx` use plain `next/link`; with `localePrefix: 'always'` a `vi` visitor gets bounced to `/en/...`. Use the `@/shared/i18n/navigation` Link (project-card already does).
- **A3 — Invisible mobile nav**: the only nav trigger is the logo as a bare `motion.button` — no hamburger, no `aria-label`/`aria-expanded` (`public-header-main-nav.tsx:69-76`); menu has no Escape/focus-trap (`public-header-mobile-nav.tsx:58-75`). The package's `Sheet`/`Drawer` already solve this.
- **A4 — `<Link><Button>` nesting** (5 sites: main-nav, homepage-profile, recent-projects, contact-CTA, profile-empty): invalid HTML, double tab stops. Use `<Button asChild>` (blog-not-found does it right).
- **A5 — Dashboard has no mobile handling at all**: always-visible `w-[260px]` sticky sidebar + `container py-6` + `p-10` leaves ~35 px of content on a phone (`dashboard-sidebar.tsx:111`, dashboard `layout.tsx:15-16`).
- **A6 — Clipped tables in blog posts**: `[&_table]:w-full` inside `overflow-hidden` article — wide tables unreachable on phones (`UI/rich-text.tsx:92`, `blog-content.tsx:35`).
- **A7 — Tiny/unlabeled targets**: clear-search icons (~19 px, no aria-label) in blog/project filters; blog-card tag pills ~20 px tall; like/clap buttons have no `aria-pressed`/label; hide-comment button is invisible-until-hovered-on-itself and icon-only.
- **A8 — Home never highlighted** in desktop nav (`'/'+segment` = `'/null'` on homepage); mobile nav and footer handle it correctly.
- **A9 — Filters aren't URL-synced**: blog filters read `?tags=`/`?q=` but never write back; project filters have no URL support — views unshareable, back-button surprises (`use-blog-filter.ts:11-21`).

## 3. Consistency systems (one concept, N implementations)

| Concept | Current state | Target |
|---|---|---|
| **Tag pill** | 4 visual treatments: hand-rolled buttons in blog-card, `TagClickableBadge` (projects/filters), rounded-full Badge links in blog detail, non-locale-resolved Badge in blog-editor-card | One `TagClickableBadge` (props: `icon?`, `pill?`, `href \| onClick`), built on a button-Badge (A1) |
| **Delete confirmation** | 4 patterns: native `confirm()` (education), hand-rolled AlertDialog ×2 (blog/project), shared `ConfirmDeleteDialog` (tag/tech-stack), nothing (media) | `ConfirmDeleteDialog` everywhere |
| **Toasts** | Dead shadcn store (B1) + sonner in one file | sonner only |
| **Date formatting** | 3 mechanisms, 4 formats, locale dropped in 3 call sites (mixed-language ranges under `vi`); list shows day, detail shows month-year for the same field | One `formatDate(date, locale, style)`; ban raw `date-fns/format` in tsx |
| **Dashboard loading** | 10 byte-identical `loading.tsx` files hardcoding `pl-[256px]` (sidebar is actually 260 px) | One shared `DashboardRouteLoading`, sidebar width as a token |
| **List skeletons** | Route loaders use generic slabs that don't match cards (padding/grid also differ from the real page); `BlogCardSkeleton` exists but is unused there; blog skeleton's structure doesn't match blog-card | Reuse entity card skeletons in route loaders with identical grid/padding |
| **Empty states** | Shared `Empty` primitive exists; 3 of 6 empties hand-roll the same stack; media-library-empty misuses the API; tech-stack manager has **no** empty state | Migrate all onto `Empty*`; no new primitive needed |
| **Manager screens** | Loading (4 styles), empty (4 styles), pagination (blog/project lack `placeholderData` so page flips collapse to spinner and `isPlaceholderData` is always false) | Shared `ManagerListState` + `placeholderData: (prev) => prev` |
| **Form validation display** | education-dialog: zero `FormMessage`; project-dialog: partial; tag-dialog: raw `register` with no error rendering; tech-stack-dialog: correct | `FormField`+`FormControl`+`FormMessage` everywhere via a `TextField` wrapper |

## 4. Component library health (`packages/ui`)

**Type-safety suppressions** (all removable, mostly trivial):
- `search-and-replace.tsx:226,254` — `@ts-ignore` ×2 hide `Node` vs `Element.scrollIntoView`; also a real crash if `domAtPos` returns a text node. Fix: `instanceof HTMLElement` guard. Related: `selectPrevious` lacks the undefined guard `selectNext` has.
- `search-and-replace-toolbar.tsx:4` — `@ts-nocheck` hides one radix `CheckedState` mismatch. Trivial.
- `link.tsx:4`, `color-and-highlight.tsx:4`, `image-placeholder.tsx:4` — inherited template `@ts-nocheck`, hide only lint-level nits. Trivial.
- `lib/tiptap-utils.ts:20` — mid-function `@ts-nocheck` is inert noise; adjacent unguarded `firstChild?.toJSON()`.
- Lowercase `any`: `use-clipboard.ts:10` (should be `string`), `use-window-event.ts:13,15`.

**Broken styling from the upstream template:** `link.tsx`, `search-and-replace-toolbar.tsx`, `color-and-highlight.tsx` use Radix-scale classes (`text-gray-11`, `hover:bg-gray-3`, …) that don't exist in the Tailwind config — they compile to nothing. Also `search-and-replace.tsx:288-289` highlights with `bg-yellow-200/500` — unreadable in dark mode.

**i18n leaks (hardcoded English in reusable components):** `pagination.tsx` ("Page X of Y", "Previous/Next" — also renders on empty lists), `confirm-delete-dialog.tsx` ("Cancel" not overridable), `date-picker.tsx`, `multi-select.tsx`, `rich-text-editor.tsx` (placeholder, "Table of Contents"), `rich-text-editor-lite.tsx` (uses browser `prompt()`), `floating-menu.tsx` (all slash-command titles). Two components go the *other* way and import `next-intl` directly (`expandable-text`, `filter-multi-select-section`) — take labels as props and drop the peer dep.

**API problems:** `Pagination` takes `setPage: Dispatch<SetStateAction<number>>` (forces `useState`, blocks URL-driven pagination; change to `onPageChange`); `AutoGrowingTextArea` doesn't extend textarea props (no `name`/`onBlur`/refs → awkward with RHF); ~11 components missing `className` passthrough; `AlignmentTooolbar` typo (three o's) in the public API; `absoluteUrl` reads a Next env var and has zero consumers (delete).

**Dead code:**
- Entire lexical editor: `rich-text-editor/blocks/editor-00/**` + `rich-text-editor/editor/**` + deps `lexical`, `@lexical/react`, `@lexical/rich-text`. **Recommend delete (awaiting owner sign-off).**
- Whole files with zero consumers: `breadcrumb`, `collapsible`, `progress`, `switch`, `toggle`, `sheet`, `table`, `toast` (post-B1). Note: `sheet` becomes useful if A3/A5 adopt it.
- Zero-byte file: `W/entities/tech-stack/ui/tech-stack-card.tsx`.
- Dead individual exports: `HardBreakToolbar`, `useDebouncedValue`, `useResizeObserver` (the `useElementSize` alias is the live one), `reducer` from use-toast, and ~30 unused sub-part exports (full list in the audit transcript; most are normal shadcn API surface — prune opportunistically).

## 5. Reusability refactors (biggest duplication wins)

1. **`usePaginatedCrudManager` hook** — `blog-manager.tsx` and `project-manager.tsx` are ~95 % identical (state, query, mutations, dialogs); `use-tag-management.ts`/`use-tech-stack-management.ts` are near-duplicates of each other and already show the right shape. One generic hook + `ConfirmDeleteDialog` + sonner toasts fixes findings across §1 and §3 by construction.
2. **`<TranslationTabs>`** — the language-tabs field-array block is triplicated (`blog-form.tsx:256-376`, `project-dialog.tsx:234-311`, `education-dialog.tsx:170-253`). Extracting it also fixes the `'New'`-as-language-code bug (append `language: ''` + validate).
3. **`<TextField>` wrapper** — the 10-line `FormField→FormItem→FormLabel→Input→FormMessage` block repeats ~30×; a wrapper fixes the missing-validation-display findings by construction.
4. **Prisma→view-model mappers** — tag mapping duplicated 6×, tech-stack 10-field block 4×, with drift (paginated queries fall back to `''`, by-id/recent throw). `toPublicTag()`, `toPublicTechStack()`, `toPublicProject()` in the entity `model` folders; pick one missing-translation policy. (B2 is the defect this duplication already caused.)
5. **Split the big three forms** — `blog-form.tsx` (395), `project-dialog.tsx` (328), `education-dialog.tsx` (309): extract `TranslationTabs` + `map*ToFormValues()` pure functions + (blog) `BlogMetaFields`. In the package: extract `floating-menu.tsx`'s command registry to data (enables i18n), `TiptapImage` node view from `image.tsx`, and a shared `ImageSourceForm` (image insert/replace forms are duplicated).

## 6. Smaller notes

- Raw `<img>` → `next/image`: 6 convertible sites (blog-card cover is the LCP win; media-select/multi-select ×5); tech-stack badges render the same logo two different ways. Keep raw in `og/route.tsx` (Satori) and the editor package.
- `text-[10px]` ×18 / `text-[11px]` ×6 across cards — add `2xs`/`3xs` font tokens.
- `z-[10000]`/`z-[9999]` in the header vs standard scale elsewhere.
- Companies and Translations sidebar links lead to heading-only stubs; experience page hardcodes `companies = []` and can render the literal string "null".
- `console.log` on every render in `blogs-content.tsx:32`.
- Unsaved-changes: every dialog discards on Esc/overlay click; worst for the blog editor.
- Two shadcn generations mixed (`empty.tsx` new-style vs `forwardRef` everywhere else); `class-variance-authority@0.4` is 3 majors old.
- Hook files use `namespace` merging with eslint-disables for the banned rule — drop the namespaces.
- Cards (blog/project/media/tag-row) genuinely differ — a shared "EntityCard" would be over-abstraction. Only the tag pill row and stat items are worth sharing.

## Suggested fix order

1. **Bugs (§1)** — B1 (toasts) and B4 (dummyUpload) first; both are single-cause, multi-symptom.
2. **A11y/mobile HIGHs (§2 A1–A5)** — badge-as-button, i18n Link, mobile nav, dashboard responsiveness.
3. **Consistency systems (§3)** — confirm-dialog + toast unification ride along with the CRUD hook (§5.1).
4. **Library health (§4)** — suppression removal, dead-code deletion (needs sign-off), i18n props.
5. **Reusability refactors (§5)** — highest effort; do opportunistically per screen.

## 7. Client/server boundary audit (added 2026-07-11)

**Verdict: nothing broken today.** Every hook-using module is reachable only
through `'use client'` ancestors; all `'use server'` exports are async; no
non-serializable props cross the boundary. Fixed immediately after the audit:

- **Hydration (fixed):** theme toggle branched on `resolvedTheme` pre-mount →
  mismatch on every public page (`color-scheme-mode-toggle.tsx`, now
  mount-guarded); `Math.random()` skeleton (§1 B12).
- **Hardening (fixed):** `'use client'` added to all `packages/ui` hooks and
  interactive leaf components (`Pagination`, `DeleteButton`, `EditButton`) plus
  the 6 entity `use-*` hook files and 2 app components missing it — previously
  one accidental server-page import away from runtime errors; misused
  `'use server'` removed from 3 server-component files (`stats-grid`,
  `like/clap-button-wrapper`) where it exposed them as publicly POST-able
  action endpoints; barrel self-imports in `pagination`/`submit-button`
  replaced with direct imports (kills a circular import and stops the whole
  barrel — tiptap included — entering the server module graph); dead `delay()`
  removed from `shared/lib/utils.ts` (its `env.NODE_ENV` read would throw
  "server-side environment variable on the client" if ever called client-side);
  duplicate `export * from './comment'` in the entities barrel.

**Still open:**

- `shared/api/{mailer,s3-storage-api,public-action-template}.ts`,
  `shared/config/env.ts`, `shared/lib/auth/*` instantiate secrets-bearing
  clients at module scope with no `import 'server-only'` guard. The
  `server-only` package is the standard fix — **not installed; needs
  dependency approval.**
- Latent tz/locale formatting (`format(new Date(...))` in blog-card,
  contact-message-gallery, comment-item; `toLocaleString` in `UI/calendar.tsx`)
  is safe today because that data renders client-side only — becomes a
  hydration bug if those queries ever get SSR seeding. Folds into the shared
  date-formatter work (§3).
- `public-header-mobile-nav.tsx` uses `typeof window === 'undefined'` instead
  of a mounted guard — works (portal), but fragile; migrate when adopting
  `Sheet` (§2 A3).

## Coverage

Public routes/widgets/features/entity UI read in full; all 7 dashboard managers + dialogs + hooks; all of `packages/ui` (suppression files, editors, hooks read fully; vanilla shadcn primitives swept by pattern); all 17 route `loading.tsx`; entity API mapping files. Dead-export scan covered every barrel export cross-checked against `apps/web/src`. Not audited: auth/login surface, `profile-translation-card` internals, prod build/runtime behavior (no node available — static analysis only).
