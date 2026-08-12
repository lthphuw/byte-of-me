# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/byte-of-me/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

**Project:** Byte of Me
**Category:** Portfolio/Personal (public) + CMS Dashboard (private) + Notes/Graph space
**Generated:** 2026-08-12 — `ui-ux-pro-max`, dials Variance 4 / Motion 5 / Density 5
**Status:** Descriptive, not aspirational. This documents the system that *ships*.

---

## 0. Provenance — read this before "fixing" anything

This file was seeded by `ui-ux-pro-max --design-system` and then **reconciled against the
codebase**. The generator's raw output conflicted with the shipped implementation on five
counts. Each was overridden deliberately; do not re-apply the generator's version.

| Generator said | This repo does | Why the repo wins |
|---|---|---|
| Hex tokens named `--color-primary` | HSL triplets named `--primary` | shadcn convention, already wired through `tailwind.config.ts`. Renaming touches every component for zero gain. |
| Archivo / Space Grotesk via Google CDN | **Inter + Cal Sans**, self-hosted `next/font/local` | Self-hosted woff2 has no third-party request and better LCP. Cal Sans is also embedded in `/api/og` via `fs.readFile`; swapping fonts breaks OG image generation. |
| Raw CSS `.btn-primary` / `.card` classes | shadcn primitives + CVA variants in `packages/ui` | The repo has no hand-rolled component CSS layer and should not grow one. |
| `background: white` in component specs | Token-driven, dual-theme | Hardcoded white breaks dark mode, which is fully supported. |
| **GSAP** stagger snippet | **framer-motion** (`m.*` under `LazyMotion`) | GSAP is not a dependency in any workspace. Do not add it. |

What the generator got *right* and is kept: style direction **Motion-Driven + Minimalism**,
pattern **Portfolio Grid** (storytelling section order), and the anti-pattern list.

---

## 1. Color

Source of truth: `apps/web/src/app/globals.css`. Tokens are **HSL triplets without the
`hsl()` wrapper** — Tailwind wraps them (`hsl(var(--border))`). Never write a raw hex in a
component.

| Token | Light | Dark |
|---|---|---|
| `--background` | `0 0% 100%` | `0 0% 3.9%` |
| `--foreground` | `0 0% 3.9%` | `0 0% 98%` |
| `--muted` | `0 0% 96.1%` | `0 0% 14.9%` |
| `--muted-foreground` | `0 0% 45.1%` | `0 0% 63.9%` |
| `--card` / `--popover` | `0 0% 100%` | `0 0% 3.9%` |
| `--border` / `--input` | `0 0% 89.8%` | `0 0% 14.9%` |
| `--primary` | `0 0% 9%` | `0 0% 98%` |
| `--primary-foreground` | `0 0% 98%` | `0 0% 9%` |
| `--secondary` | `0 0% 96.1%` | `0 0% 14.9%` |
| `--accent` | `0 0% 96.1%` | `0 0% 14.9%` |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` |
| `--ring` | `0 0% 3.9%` | `0 0% 83.1%` |
| `--radius` | `0.5rem` | — |

Charts use `--chart-1..5` and differ per theme (warm/earth in light, saturated hues in
dark). Read them from the CSS, don't re-derive.

Four literal Tailwind colors also exist for non-token surfaces:
`neutral-dark hsl(220 5% 15%)`, `neutral-light hsl(220 5% 96%)`,
`neutral-lighter hsl(220 5% 90%)`, `neutral-gray hsl(220 5% 85%)`.

### The palette is fully achromatic — deliberate, decided 2026-08-12

Every token is `0%` saturation. `--accent` is a light gray, **not an accent**: it is a
hover/surface tint. There is no brand hue and no colored CTA anywhere, by choice.

The generator proposed `#2563EB` for the accent slot. **Declined.** Monochrome is the
identity here, and `--accent` already has a load-bearing shadcn meaning (hover surfaces)
that repurposing would break.

**Consequence you must design around:** color is not available to you as a signal. Anything
that would normally be marked by a hue — links, CTAs, active states, validation — needs a
non-color affordance: an underline, a border, a weight change, an icon, or a fill.

If a brand hue is ever wanted, add a **new** `--brand` token rather than repurposing
`--accent`, and contrast-check it against both `--background` values.

#### Links must be underlined at rest

`--primary` is 9% lightness and `--foreground` is 3.9% — visually the same. A link
distinguished only by `text-primary` is invisible as a link, and a hover-only underline
does not exist on touch at all. The `link` button variant therefore ships
`underline ... hover:no-underline`: the underline is the affordance, and removing it is the
hover state. Found on the homepage's "View all projects", which read as a plain sentence.

### `.force-light-surface`

A subtree pinned to the light palette regardless of `.dark` on `<html>`, for the print
view. Custom properties cascade, so a subtree can only win by redeclaring them.
**If you change `:root`, update this block in step** — it is a manual copy.

---

## 2. Typography

- **Body:** Inter — `next/font/google`, `--font-sans`, `preload: true`
- **Heading:** Cal Sans SemiBold — `next/font/local` from `apps/web/src/app/assets/fonts/CalSans-SemiBold.woff2`, `--font-heading`, `preload: true`

Wired in `apps/web/src/app/[locale]/layout.tsx`; exposed as `font-sans` / `font-heading`.
`body` sets `font-feature-settings: 'rlig' 1, 'calt' 1`.

Prose is handled by `@tailwindcss/typography`, with `code::before`/`code::after` content
stripped so inline code renders without backticks.

**Vietnamese is a first-class locale.** Never uppercase abbreviated dates — `thg 4` looks
broken in caps. This is why `.meta-label` is not `uppercase`.

### Shared text utilities

| Utility | Purpose |
|---|---|
| `.meta-label` | The one label style across every list surface — post dates, project ranges, stats, timeline years. It is what makes the blog grid and project timeline read as one system. |
| `.article-text` | `leading-relaxed text-justify tracking-normal break-safe` |
| `.break-safe` | `hyphens: auto` + `overflow-wrap: anywhere` — required for long unbroken tokens |
| `.container-bg` | Translucent blurred panel, dual-theme |

---

## 3. Spacing, layout & density

The repo uses **Tailwind's default scale**, not `--space-*` variables. Do not introduce a
parallel spacing vocabulary.

Container: centered, `2rem` padding, max `1400px` at `2xl`.
Radius: `lg = var(--radius)`, `md = calc(--radius - 2px)`, `sm = calc(--radius - 4px)`.

### Density varies by surface — the dial is per-surface, not global

| Surface | Density | Notes |
|---|---|---|
| Public (home, about, projects, blogs, contact) | Spacious (~4/10) | Content-first, storytelling order |
| Dashboard (`(protected)/dashboard/*`) | Dense (~8/10) | Table/form CMS, compact rows |
| Notes & graph (`(protected)/space/*`) | Dense (~8/10) | Editor + graph canvas |

Put per-surface rules in `pages/` overrides rather than bending Master.

### Layout rule with teeth

**Wrappers must use `overflow-x-clip`, never `overflow-hidden`.** `overflow-hidden` creates
a scroll container and silently kills every `position: sticky` descendant — no error, the
element just stops sticking.

---

## 4. Motion

**framer-motion only. GSAP is not installed; do not add it.**

`MotionProvider` (`packages/ui/src/motion/motion-provider.tsx`) sits at the app root via
`global-provider.tsx` and does two things:

1. `LazyMotion` code-splits the feature set — **use `m.*`, not `motion.*`**, or the bundle
   saving is lost. `strict` is off so legacy `motion.*` still works.
2. `MotionConfig reducedMotion="user"` — **`prefers-reduced-motion` is already honoured for
   every framer-motion animation in the app.** Transform/layout animations are disabled,
   opacity fades kept. Do not hand-roll `useReducedMotion` checks.

### Durations (from `tailwind.config.ts`)

| Animation | Duration | Note |
|---|---|---|
| `accordion-down` / `-up` | 200ms ease-out | |
| `collapsible-down` | 180ms ease-out | |
| `collapsible-up` | 120ms ease-in | Exit is faster — collapsing should get out of the way, not linger |
| `gradient` | 8s linear infinite | Decorative |
| `ping-3` | 1s × 3 | |

Hover/state transitions: **150–300ms**. Never 0ms.

`collapsible-*` is deliberately **not** a height animation: Radix measures
`--radix-collapsible-content-height` at mount, but TipTap renders a tick later
(`immediatelyRender: false`), so the measurement lands ~180px against ~610px of real
content and the tween snaps. Opacity + a 4px lift need no measurement.

### Reduced motion needs BOTH halves — CSS and JS

Resolved 2026-08-12. Smooth scrolling is a WCAG 2.3.3 vestibular trigger, and it arrives
by two independent routes that do not cover each other:

1. **CSS** — `html { scroll-behavior: smooth }` governs anchor jumps and any
   `scrollIntoView()` that names no behavior. Gated by a
   `@media (prefers-reduced-motion: reduce)` block in `globals.css`.
2. **JS** — a call passing `behavior: 'smooth'` **explicitly** always animates, whatever
   the stylesheet says. Per spec, CSS only decides when the caller passes `'auto'` or stays
   silent. These go through `scrollIntoViewBehavior()` from
   `@byte-of-me/ui/lib/prefers-reduced-motion`.

**Adding a new programmatic scroll? Use `scrollIntoViewBehavior()`, never a literal
`'smooth'`.** Five call sites currently use it (blog ToC, citation links, note outline,
editor outline, editor search-and-replace).

The helper reads `matchMedia` at call time rather than wrapping `useMediaQuery`, because
every caller is an event handler that wants the value at the instant it scrolls — and two
of them are not React at all.

### Deliberately left animating under reduced motion

`animate-spin` (23×) and `animate-pulse` (10×) are loading indicators. Freezing them
removes the feedback that something is in progress, which is a worse outcome than the
motion itself; they are small, local, and not vestibular triggers. `collapsible.tsx`
already opts out via Tailwind's `motion-reduce:animate-none` where it matters.

---

## 5. Style direction

**Motion-Driven + Minimalism** (secondary: Brutalism, Aurora UI).
Light ✓ full · Dark ✓ full.

**Pattern — Portfolio Grid / storytelling:**
1. Hero (name/role) → 2. Project grid → 3. About/philosophy → 4. Contact.
CTA placement: project-card hover + footer contact.

Effects: scroll-triggered entrance, hover 300–400ms, page transitions. Fast loading is part
of the aesthetic — this is a portfolio, visuals load first.

---

## 6. Icons

**Lucide (`lucide-react`)** is the primary set; `react-icons` is present for brand marks
only. Never use emoji as icons.

Where an icon must inherit `currentColor` inside prose, use a CSS mask rather than an
`<svg>` fill — see `.references-backlink` in `globals.css`.

---

## 7. Anti-patterns (repo-specific — these have all bitten before)

- ❌ **`overflow-hidden` on layout wrappers** — kills `position: sticky` silently. Use `overflow-x-clip`.
- ❌ **Importing from the `@/shared/ui` barrel in a root layout or route** — the barrel reaches the TipTap editor and drags it into every bundle. Import by path (see the comment in `layout.tsx`).
- ❌ **`motion.*` under `MotionProvider`** — defeats `LazyMotion` code-splitting. Use `m.*`.
- ❌ **Literal `behavior: 'smooth'` in a `scrollIntoView` call** — bypasses the reduced-motion media query entirely. Use `scrollIntoViewBehavior()` (§4).
- ❌ **A link marked only by text color** — the palette is achromatic, so color carries no signal. Underline it (§1).
- ❌ **Raw hex in components** — use `hsl(var(--token))`.
- ❌ **Hardcoded `background: white`** — breaks dark mode.
- ❌ **Emoji as icons.**
- ❌ **Height-based collapse animations around TipTap** — measurement races the editor mount.
- ❌ **Uppercased date/meta labels** — breaks Vietnamese abbreviations.
- ❌ **Instant state changes (0ms)** and **invisible focus rings.**
- ❌ Corporate-template / generic layout shapes.

---

## 8. Pre-delivery checklist

- [ ] No emoji as icons; all icons from Lucide
- [ ] `cursor-pointer` on every clickable element
- [ ] Hover/state transitions 150–300ms
- [ ] Text contrast ≥ 4.5:1 in **both** light and dark
- [ ] Focus states visible for keyboard nav
- [ ] Touch targets ≥ 44×44px with ≥ 8px spacing
- [ ] `prefers-reduced-motion` respected — free for framer-motion; any **new programmatic scroll** must use `scrollIntoViewBehavior()` (§4)
- [ ] Responsive at 375 / 768 / 1024 / 1440px; no horizontal scroll
- [ ] Both locales checked (`en`, `vi`) — Vietnamese strings run longer
- [ ] Dark mode checked, including any `.force-light-surface` subtree
- [ ] `bun run check` passes — **read the output**, don't assume

---

## 9. Stack notes

Next.js 16 (App Router, Turbopack, React 19) · Tailwind + shadcn/ui + Radix ·
framer-motion · `next-themes` (class strategy) · Bun 1.3.10 toolchain, **Node runtime**.

Components live in `packages/ui`, consumed as TypeScript source via `transpilePackages` —
no build step before `dev`.
