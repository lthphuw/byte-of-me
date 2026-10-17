# Docs

Start with **[setup.md](setup.md)** to run the project. Code guides are in [codebase/](codebase/).

| Doc | Read it for |
| --- | --- |
| [setup.md](setup.md) | First-time setup, locked versions, troubleshooting |
| [environment.md](environment.md) | Every env key: required, local value, where it is read |
| [architecture.md](architecture.md) | Diagrams: system context, packages and their layers, FSD layers, request and cache flow |
| [codebase/web-app-routes.md](codebase/web-app-routes.md) | Routes, layouts, route handlers, cache headers |
| [codebase/web-features.md](codebase/web-features.md) | Features: auth, dashboard, public |
| [codebase/web-widgets.md](codebase/web-widgets.md) | Widgets: page sections and dashboard managers |
| [codebase/web-entities-content.md](codebase/web-entities-content.md) | Entities: blog, company, education, featured work |
| [codebase/web-entities-supporting.md](codebase/web-entities-supporting.md) | Entities: comment, contact, media, open source, project, social links, tags, tech stack, profile, settings |
| [codebase/web-shared.md](codebase/web-shared.md) | Shared layer: helpers, i18n, auth, test wiring |
| [codebase/packages-db.md](codebase/packages-db.md) | Database: schema, migrations, client |
| [codebase/packages-ui.md](codebase/packages-ui.md) | The `ui` facade and the packages behind it, `rich-text-editor`, `rich-text-schema`, `rich-text-render`, `ui-utils`, `ui-hooks`, `ui-motion`, `ui-primitives`, `ui-toast`, `ui-forms`, `ui-carousel`: exports, components, editor |
| [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md) | Scripts, git hooks, Turborepo, Docker, config, api-core, contracts, query, github, storage and logger packages |

Overview and command list: [../README.md](../README.md).

## Keeping these docs current

A code change is not finished until the doc that describes it says the same thing. Before a commit, find every doc that names what you changed, and update it in the same commit:

```sh
rg -n '<symbol, path or route>' docs README.md apps/web/README.md
```

| Code area | Doc to update |
| --- | --- |
| Routes, layouts, route handlers, metadata routes, `next.config.js` redirects and `headers()` | [codebase/web-app-routes.md](codebase/web-app-routes.md) |
| SEO and metadata: `sitemap.ts`, `robots.ts`, `llms.txt`, `feed.xml`, JSON-LD, alternates | [codebase/web-app-routes.md](codebase/web-app-routes.md) and [codebase/web-shared.md](codebase/web-shared.md) |
| `apps/web/src/entities/**` (server API, query keys, cache tags) | [codebase/web-entities-content.md](codebase/web-entities-content.md), [codebase/web-entities-supporting.md](codebase/web-entities-supporting.md) |
| `apps/web/src/entities/*/query/**` (`queryOptions` factories, client read and write hooks) | [codebase/web-entities-content.md](codebase/web-entities-content.md), [codebase/web-entities-supporting.md](codebase/web-entities-supporting.md), and [codebase/web-shared.md](codebase/web-shared.md) for the shared hooks they call |
| `apps/web/src/widgets/**` | [codebase/web-widgets.md](codebase/web-widgets.md) |
| `apps/web/src/features/**` | [codebase/web-features.md](codebase/web-features.md) |
| `apps/web/src/shared/hooks/**` (`useCrudManager`, `useEditorLabels`: the hooks that read next-intl) | [codebase/web-shared.md](codebase/web-shared.md) |
| `apps/web/src/shared/ui/shell.tsx` (`ShellBase`, the public page frame) | [codebase/web-shared.md](codebase/web-shared.md) |
| `apps/web/src/shared/**` (helpers, i18n, auth, metadata, test wiring) | [codebase/web-shared.md](codebase/web-shared.md) |
| `packages/db/**` (schema, migrations, seed) | [codebase/packages-db.md](codebase/packages-db.md) |
| `packages/ui/**` (the facade), `packages/rich-text-editor/**` (`RichTextEditor`, its toolbars and extensions, `editor-surface.css`, the drawer), `packages/rich-text-schema/**` (the render schema the editor and the server renderer share, `sanitizeHtml`, the rich-text content helpers, `image-ratios`), `packages/rich-text-render/**` (`RichText`, `RichTextHtml`, `renderRichTextHtml`, `MermaidBlocks`, `MathRenderer`, the mermaid size codec), `packages/ui-utils/**` (`cn`, link and scroll helpers), `packages/ui-hooks/**` (including `usePrintOnFontsReady`), `packages/ui-motion/**` (`MotionProvider`, tokens, variants), `packages/ui-primitives/**` (Radix wrappers, composites, surface classes, `ContentFade`, `StateBlock`), `packages/ui-toast/**` (`Toaster`), `packages/ui-forms/**` (`Form`, `Calendar`, `DatePicker`, `Command`, `MultiSelect`, `useFormAutosave`, `useResetOnOpen`, `useRevealOnInvalidSubmit`), `packages/ui-carousel/**` (`Carousel`, `useEmblaState`) | [codebase/packages-ui.md](codebase/packages-ui.md); a changed export also in the package's own `README.md` |
| `packages/api-core/**` (`ApiResponse`, `parseInput`, `clampPagination`, `unwrapApiResponse`, `ServerActionError`, `CACHE_TAGS`, `INTERACTION`, the filter, i18n, URL and email helpers) | [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md); the app-side consumers also in [codebase/web-shared.md](codebase/web-shared.md); a changed export also in the package's own `README.md` |
| `packages/contracts/**` (the entities' zod schemas, `query-keys.ts` factories, `upload-constraints`, `revalidation` maps, `richTextDocSchema`, the image-compression config and rules) | [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md); the entity-side consumers in [codebase/web-entities-content.md](codebase/web-entities-content.md) and [codebase/web-entities-supporting.md](codebase/web-entities-supporting.md); a changed export also in the package's own `README.md`. A changed query-key shape also in the prefetch that uses it |
| `packages/query/**` (`useServerMutation`, `useInfiniteListQuery`, `useEditingRecord`, `useUrlSyncedSearch`, `QueryState`, `makeQueryClient` / `getQueryClient`, `ADMIN_PAGE_SIZE` / `ADMIN_OPTIONS_LIMIT`) | [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md); the app-side consumers in [codebase/web-shared.md](codebase/web-shared.md) ("Client query layer"); a changed export also in the package's own `README.md` |
| `packages/github/**` (`fetchMergedPullRequests`, `groupByRepo`, the ledger helpers, `fetchFeaturedWorkGithub`, `parseGithubPullRequestUrl` and their types) | [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md); the entity-side callers in [codebase/web-entities-supporting.md](codebase/web-entities-supporting.md) and [codebase/web-entities-content.md](codebase/web-entities-content.md); a changed export also in the package's own `README.md` |
| `packages/storage`, `packages/logger`, root `package.json` scripts, `turbo.json`, git hooks, Docker | [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md) |
| `packages/config/**` (tsconfig presets, `boundaries.json`, `test/` preloads) | [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md); the layer model also in [architecture.md](architecture.md) |
| `scripts/**` (`check.sh`, `check-boundaries.ts`, `new-package.ts`, `gen-icons.ts`) | [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md), [../README.md](../README.md) for the script table |
| Environment keys (`env.ts`, `.env.example`) | [environment.md](environment.md) |
| Setup steps and commands | [setup.md](setup.md), [../README.md](../README.md) |
| Layers (FSD and package layers), diagrams, request and cache flow | [architecture.md](architecture.md) |

Rules:

- Update the doc in the **same commit** as the code. A follow-up docs commit leaves the history wrong for the commit in between.
- Fix a claim that became false, in place. Do not add a note beside it.
- Line numbers are references. Re-check the ones near your edit with `rg -n`, and update those that moved.
- A rename or a moved file updates every doc that names the old one. `rg` for the old name must return nothing.
- A new route, page, env key, package or script gets a row in the doc for its area. `bun run new-package` prints this step; a package also gets a layer in `packages/config/boundaries.json`.
- Describe behaviour as measured in the running app (`bun run build`, then `next start`), not as the code intends it. Production can differ: see the `/api/og` note in [codebase/web-app-routes.md](codebase/web-app-routes.md).

Not in a clone (gitignored, owner only): `docs/superpowers/` (specs and plans), `docs/notes.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/`.
