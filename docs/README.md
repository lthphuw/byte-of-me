# Docs

Start with **[setup.md](setup.md)** to run the project. Code guides are in [codebase/](codebase/).

| Doc | Read it for |
| --- | --- |
| [setup.md](setup.md) | First-time setup, locked versions, troubleshooting |
| [environment.md](environment.md) | Every env key: required, local value, where it is read |
| [architecture.md](architecture.md) | Diagrams: system context, packages, FSD layers, request and cache flow |
| [codebase/web-app-routes.md](codebase/web-app-routes.md) | Routes, layouts, route handlers, cache headers |
| [codebase/web-features.md](codebase/web-features.md) | Features: auth, dashboard, public |
| [codebase/web-widgets.md](codebase/web-widgets.md) | Widgets: page sections and dashboard managers |
| [codebase/web-entities-content.md](codebase/web-entities-content.md) | Entities: blog, company, education, featured work |
| [codebase/web-entities-supporting.md](codebase/web-entities-supporting.md) | Entities: comment, contact, media, open source, project, social links, tags, tech stack, profile, settings |
| [codebase/web-shared.md](codebase/web-shared.md) | Shared layer: helpers, i18n, auth, test wiring |
| [codebase/packages-db.md](codebase/packages-db.md) | Database: schema, migrations, client |
| [codebase/packages-ui.md](codebase/packages-ui.md) | UI package: exports, components, editor |
| [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md) | Scripts, git hooks, Turborepo, Docker, storage and logger packages |

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
| `apps/web/src/widgets/**` | [codebase/web-widgets.md](codebase/web-widgets.md) |
| `apps/web/src/features/**` | [codebase/web-features.md](codebase/web-features.md) |
| `apps/web/src/shared/**` (helpers, i18n, auth, metadata, test wiring) | [codebase/web-shared.md](codebase/web-shared.md) |
| `packages/db/**` (schema, migrations, seed) | [codebase/packages-db.md](codebase/packages-db.md) |
| `packages/ui/**` | [codebase/packages-ui.md](codebase/packages-ui.md) |
| `packages/storage`, `packages/logger`, `packages/config`, root scripts, git hooks, Docker | [codebase/tooling-and-small-packages.md](codebase/tooling-and-small-packages.md) |
| Environment keys (`env.ts`, `.env.example`) | [environment.md](environment.md) |
| Setup steps and commands | [setup.md](setup.md), [../README.md](../README.md) |
| Layers, diagrams, request and cache flow | [architecture.md](architecture.md) |

Rules:

- Update the doc in the **same commit** as the code. A follow-up docs commit leaves the history wrong for the commit in between.
- Fix a claim that became false, in place. Do not add a note beside it.
- Line numbers are references. Re-check the ones near your edit with `rg -n`, and update those that moved.
- A rename or a moved file updates every doc that names the old one. `rg` for the old name must return nothing.
- A new route, page, env key, package or script gets a row in the doc for its area.
- Describe behaviour as measured in the running app (`bun run build`, then `next start`), not as the code intends it. Production can differ: see the `/api/og` note in [codebase/web-app-routes.md](codebase/web-app-routes.md).

Not in a clone (gitignored, owner only): `docs/superpowers/` (specs and plans), `docs/notes.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/`.
