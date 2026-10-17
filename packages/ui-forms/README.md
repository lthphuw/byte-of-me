# @byte-of-me/ui-forms

Layer 2 in `packages/config/boundaries.json`: it may import only lower layers.
Consumed as TypeScript source through `transpilePackages`; there is no build step.

The form controls built on a third-party library plus `ui-primitives` and `ui-utils`.
All of them come from the root (`src/index.ts`):

- `form`: `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`,
  `FormDescription`, `FormMessage`, `useFormField` (react-hook-form). `FormControl`
  hands `id`, `aria-describedby` and `aria-invalid` to its child.
- `calendar`: `Calendar`, a react-day-picker wrapper for a single date.
- `date-picker`: `DatePicker`, a `Calendar` in a popover.
- `command`: `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`,
  `CommandItem` (cmdk).
- `multi-select`: `MultiSelect`, `MultiSelectOption`, built on `command`.
- Form hooks (react-hook-form): `useFormAutosave` (debounced localStorage draft, restored
  only on the author's say-so), `useResetOnOpen` (resets a dialog's form on open or record
  change) and `useRevealOnInvalidSubmit` (calls back with the errors under a field when a
  submit attempt fails).

No i18n context here: every visible or announced string is a prop. `react` and
`react-dom` are peer dependencies. Specs run from this directory: `bunfig.toml`
preloads happy-dom against the working directory.
