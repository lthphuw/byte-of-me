import * as z from 'zod';

import {
  IMAGE_COMPRESSION_DEFAULTS,
  imageCompressionConfigSchema,
} from '../image-compression-config';

/**
 * The dashboard settings: shape, defaults and `parseWorkspaceSettings`, which
 * turns any stored `Json` (an older build's keys, a hand edit, `null`) into a
 * usable object instead of throwing mid-render. Pure: clients may import it.
 */

/** Every setting, flat. */
const workspaceSettingsSchema = z.object({
  /**
   * How uploads are compressed, in the browser and again on the server. One
   * nested object, so a write carries the WHOLE config: the jsonb merge in
   * `updateWorkspaceSettings` is a shallow `||`.
   */
  imageCompression: imageCompressionConfigSchema,
});

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

/** What every author starts with, and what any unreadable field falls back to. */
export const WORKSPACE_SETTINGS_DEFAULTS: WorkspaceSettings = {
  imageCompression: { ...IMAGE_COMPRESSION_DEFAULTS },
};

/**
 * A complete settings object from whatever was stored, field by field: one bad
 * value (an enum another build spelled differently) must not discard the rest.
 * Unknown keys are dropped so a removed setting cannot resurrect later.
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
 * The wire format for an update: any subset of the settings. Partial because
 * the dialog sends one control at a time, so two open tabs cannot clobber each
 * other's unrelated changes.
 */
export const workspaceSettingsPatchSchema = workspaceSettingsSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'Empty settings patch',
  });

export type WorkspaceSettingsPatch = z.infer<
  typeof workspaceSettingsPatchSchema
>;
