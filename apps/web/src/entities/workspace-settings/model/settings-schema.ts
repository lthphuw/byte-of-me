import * as z from 'zod';

import {
  IMAGE_COMPRESSION_DEFAULTS,
  imageCompressionConfigSchema,
} from '@/shared/lib/media/image-compression-config';

/**
 * The dashboard's settings: shape, defaults, and the one function that turns
 * whatever is in the database into a complete, valid object.
 *
 * No `'use server'` and no imports from `@byte-of-me/db`, deliberately — this
 * module is imported by the media library UI and by two server actions, so it
 * has to be reachable from a client component. Everything here is a plain
 * value or a pure function.
 *
 * The storage column is `Json` with no shape enforced by Postgres, which puts
 * the whole burden on {@link parseWorkspaceSettings}. Reading is total — a row
 * written by an older build (which still carries editor and sleep keys), a
 * field this build has never heard of, a hand-edited value, an outright `null`
 * must all produce a usable object rather than an exception on a page that has
 * already started rendering.
 */

/** Every setting, flat. */
export const workspaceSettingsSchema = z.object({
  /**
   * How uploaded images are compressed, both in the browser before they
   * cross the network and again on the server as the guarantee — see
   * `shared/lib/media/compress-image.ts` and `compress-in-browser.ts`.
   *
   * A single nested object rather than four flat `imageCompression*` keys.
   * The schema itself lives in `shared/lib/media/image-compression-config.ts`
   * because both compressors need it and neither may import this entity —
   * embedding that schema here (instead of redefining the same four fields)
   * is what keeps the settings row, the browser pass and the server pass
   * from drifting apart. The jsonb merge in `updateWorkspaceSettings` is a shallow `||`, so a
   * write always carries the WHOLE nested object, never a single inner
   * field — which is also exactly what the settings popover already does,
   * since it holds the full config in state.
   */
  imageCompression: imageCompressionConfigSchema,
});

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

/** What every author starts with, and what any unreadable field falls back to. */
export const WORKSPACE_SETTINGS_DEFAULTS: WorkspaceSettings = {
  imageCompression: { ...IMAGE_COMPRESSION_DEFAULTS },
};

/**
 * A complete settings object from whatever was stored.
 *
 * Field by field rather than all-or-nothing: a single bad value must not
 * discard the other fields. `safeParse` on the whole object would do exactly
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

export type WorkspaceSettingsPatch = z.infer<
  typeof workspaceSettingsPatchSchema
>;
