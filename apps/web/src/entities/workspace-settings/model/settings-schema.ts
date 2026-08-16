import * as z from 'zod';

/**
 * The notes workspace's settings: shape, defaults, and the one function that
 * turns whatever is in the database into a complete, valid object.
 *
 * No `'use server'` and no imports from `@byte-of-me/db`, deliberately — this
 * module is imported by the settings dialog, by the editor, and by two server
 * actions, so it has to be reachable from a client component. Everything here
 * is a plain value or a pure function.
 *
 * The storage column is `Json` with no shape enforced by Postgres, which puts
 * the whole burden on {@link parseWorkspaceSettings}. That is the trade the
 * column was chosen for: adding a setting costs a line here instead of a
 * migration against production. What it demands in return is that reading is
 * total — a row written by an older build, a field this build has never heard
 * of, a hand-edited value, an outright `null` must all produce a usable object
 * rather than an exception on a page that has already started rendering.
 */

/**
 * How much air the writing surface gets.
 *
 * These are the two rhythms defined in `editor-surface.css`; `compact` is what
 * used to be a whole second stylesheet. Applied by setting `data-editor-density`
 * on an ancestor of the editor — the CSS selectors are descendant-based, so no
 * component in `packages/ui` has to know this setting exists.
 */
export const EDITOR_DENSITIES = ['comfortable', 'compact'] as const;
export type EditorDensity = (typeof EDITOR_DENSITIES)[number];

/** Body type size on the writing surface. Floored at 16px on narrow screens. */
export const EDITOR_TYPE_SCALES = ['small', 'medium', 'large'] as const;
export type EditorTypeScale = (typeof EDITOR_TYPE_SCALES)[number];

/**
 * How long the editor waits after the last keystroke before saving.
 *
 * Named rather than a raw number: the numbers are a property of the save
 * pipeline (see `AUTOSAVE_DEBOUNCE_MS`), and a free-form millisecond field is a
 * way to set it to 5 by accident.
 */
export const AUTOSAVE_SPEEDS = ['fast', 'normal', 'relaxed'] as const;
export type AutosaveSpeed = (typeof AUTOSAVE_SPEEDS)[number];

/** Milliseconds behind each {@link AutosaveSpeed}. */
export const AUTOSAVE_SPEED_MS: Record<AutosaveSpeed, number> = {
  fast: 400,
  normal: 1000,
  relaxed: 2500,
};

/**
 * What a rename does to the labels of links pointing at the renamed note.
 *
 * Navigation is never at stake — a note link's `href` carries the note's id, so
 * it survives any rename (see `entities/note/model/note-links.ts`). Only the
 * visible text is, and only where that text is still a verbatim copy of the old
 * title.
 */
export const RENAME_LINK_POLICIES = ['always', 'ask', 'never'] as const;
export type RenameLinkPolicy = (typeof RENAME_LINK_POLICIES)[number];

/**
 * Every setting, flat.
 *
 * Flat rather than nested-by-group on purpose: the groups are a fact about the
 * DIALOG, not about the data, and nesting them here would mean a migration of
 * stored rows every time a setting moves from one panel to another. The
 * grouping lives in `settings-groups.ts`.
 */
export const workspaceSettingsSchema = z.object({
  density: z.enum(EDITOR_DENSITIES),
  typeScale: z.enum(EDITOR_TYPE_SCALES),
  /** Off means the writing column spans whatever width the pane gives it. */
  readableLineLength: z.boolean(),

  autosaveSpeed: z.enum(AUTOSAVE_SPEEDS),
  spellCheck: z.boolean(),
  /**
   * Tidy the raw-markdown pane when leaving it.
   *
   * This is the honest form of "format on save": leaving the pane is a commit
   * point, whereas a save fires mid-sentence and reformatting under a live
   * caret is how a formatter becomes the thing you switch off.
   */
  formatMarkdownOnExit: z.boolean(),
  /** Tidy only the pasted fragment, never the text already in the pane. */
  formatMarkdownOnPaste: z.boolean(),

  updateLinksOnRename: z.enum(RENAME_LINK_POLICIES),
});

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

/**
 * What every author starts with, and what any unreadable field falls back to.
 *
 * `comfortable`/`medium`/readable line length reproduce the surface exactly as
 * it renders with no settings row at all, so introducing this table changed
 * nobody's workspace. `ask` rather than `always` for renames because that one
 * writes to documents the author did not open — the safe default is the one
 * that asks first.
 */
export const WORKSPACE_SETTINGS_DEFAULTS: WorkspaceSettings = {
  density: 'comfortable',
  typeScale: 'medium',
  readableLineLength: true,

  autosaveSpeed: 'normal',
  spellCheck: true,
  formatMarkdownOnExit: false,
  formatMarkdownOnPaste: true,

  updateLinksOnRename: 'ask',
};

/**
 * A complete settings object from whatever was stored.
 *
 * Field by field rather than all-or-nothing: a single bad value must not
 * discard the other eight. `safeParse` on the whole object would do exactly
 * that, and the failure it protects against — one field written by a build that
 * spelled an enum differently — is the likely one.
 *
 * Unknown keys are dropped rather than preserved. Keeping them would mean a
 * setting removed in one release quietly resurrecting if it were ever added
 * back with a different meaning.
 */
export function parseWorkspaceSettings(stored: unknown): WorkspaceSettings {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    return { ...WORKSPACE_SETTINGS_DEFAULTS };
  }

  const record = stored as Record<string, unknown>;
  const out = { ...WORKSPACE_SETTINGS_DEFAULTS };

  for (const key of Object.keys(WORKSPACE_SETTINGS_DEFAULTS)) {
    if (!(key in record)) continue;

    const field = workspaceSettingsSchema.shape[key as keyof WorkspaceSettings];
    const result = field.safeParse(record[key]);
    if (result.success) {
      // The cast is the price of iterating a heterogeneous record; the zod
      // shape above is what actually guarantees the value matches the key.
      (out as Record<string, unknown>)[key] = result.data;
    }
  }

  return out;
}

/**
 * The wire format for an update: any subset of the settings, nothing else.
 *
 * Partial because the dialog changes one control at a time and sends only that
 * — a whole-object write would let two tabs open on the same account clobber
 * each other's unrelated changes.
 */
export const workspaceSettingsPatchSchema = workspaceSettingsSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'Empty settings patch',
  });

export type WorkspaceSettingsPatch = z.infer<typeof workspaceSettingsPatchSchema>;
