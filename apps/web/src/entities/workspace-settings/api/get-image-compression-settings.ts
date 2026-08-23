'use server';

import { getWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';

/**
 * The client-safe entry point onto the image-compression slice of the
 * workspace settings.
 *
 * `getWorkspaceSettings` itself cannot be called from client code — it has no
 * `'use server'` (so React's `cache()` works, per its own doc comment) and
 * value-imports `prisma` directly. This thin `'use server'` wrapper is what
 * `uploadSingleMedia` actually calls: that function runs in the browser up
 * until it hands off to the `uploadMedia` server action, and it needs this
 * config BEFORE that handoff — to compress a file that would otherwise be
 * rejected by the pre-flight size check for being oversized *before*
 * compression ever ran.
 */
export async function getImageCompressionSettings(): Promise<ImageCompressionConfig> {
  const settings = await getWorkspaceSettings();
  return settings.imageCompression;
}
