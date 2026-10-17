# @byte-of-me/ui-primitives

Layer 1 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

The shadcn-style components that wrap only Radix, `class-variance-authority` or
`lucide-react`, plus the ones composed from those and `ui-hooks`, `ui-motion` and
`ui-utils`. All of them come from the root (`src/index.ts`):

- Radix wrappers: `alert-dialog`, `avatar`, `checkbox`, `collapsible`, `dialog`,
  `dropdown-menu`, `label`, `popover` (with `PopoverClose`), `scroll-area`, `select`, `separator`, `sheet`,
  `switch`, `tabs`, `tooltip`.
- Plain elements: `badge`, `button`, `card`, `empty`, `input`, `loading`, `skeleton`,
  `textarea`, `content-fade` (`ContentFade`: CSS fade-in for a Suspense-resolved block)
  and `state-block` (`StateBlock`: the centred title, description and action of an
  error or empty state).
- Composites: `auto-growing-textarea`, `confirm-dialog`, `copy-button`,
  `delete-button`, `editor-skeleton`, `icons`, `pagination`.
- `lib/surface-classes`: the shared class strings of the modal, popup and menu
  surfaces (`SCRIM`, `MODAL_PANEL`, `POPUP_PANEL`, `MENU_ITEM`, ...), so `drawer` and
  `command` in other packages draw the same surface.

`react`, `react-dom` and `framer-motion` are peer dependencies. Specs run from this
directory: `bunfig.toml` preloads happy-dom against the working directory.
