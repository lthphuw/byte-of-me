import * as z from 'zod';

import { MEDIA_SCOPES } from './upload-constraints';

/** `scope` becomes a storage-key path segment, and the action takes any string. */
export const mediaScopeSchema = z.enum(MEDIA_SCOPES);
