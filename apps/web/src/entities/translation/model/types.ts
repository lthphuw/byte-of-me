import type { Translation } from '@byte-of-me/db';

/**
 * A UI-message override row. `sourceText` holds the dot-path message key
 * (e.g. `global.header.title`) and `translated` holds the override value
 * that request.ts deep-merges over the static messages.
 */
export type AdminTranslation = Translation;
