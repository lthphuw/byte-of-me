/**
 * `handlePublicAction` is the failure funnel for ~20 public reads. What this
 * spec defends is the boundary between the two audiences of a failure: the
 * caught exception message belongs in the log, and the envelope a public page
 * renders must not carry it.
 *
 * The module is `'use server'`-adjacent — it imports `server-only`,
 * `next/cache` and `next-intl/server`, all stubbed by the `Bun.plugin`
 * resolver in `apps/web/next-runtime-stubs.ts` (see AGENTS.md §10). It also
 * imports `@/shared/config/env`, which decides at import time whether it is in
 * a browser by reading `typeof window` — and the `happydom.ts` preload has
 * already put a `window` on the global by the time this file's imports run.
 * The same two global bindings are dropped and restored here as in
 * `src/entities/blog/api/get-paginated-public-blogs.spec.ts`; see that file
 * for why the happy-dom `Window` itself must be left alive.
 */
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test';

import type * as PublicActionTemplateModule from './public-action-template';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

let handlePublicAction: typeof PublicActionTemplateModule.handlePublicAction;
let PUBLIC_ACTION_FAILURE_MESSAGE: typeof PublicActionTemplateModule.PUBLIC_ACTION_FAILURE_MESSAGE;

beforeAll(async () => {
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'document');

  const mod = await import('./public-action-template');
  handlePublicAction = mod.handlePublicAction;
  PUBLIC_ACTION_FAILURE_MESSAGE = mod.PUBLIC_ACTION_FAILURE_MESSAGE;
});

afterAll(() => {
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
});

describe('handlePublicAction', () => {
  // A message shaped like the ones this actually forwarded: a driver error
  // naming a host, a port and a database role.
  const LEAKY = 'connect ECONNREFUSED 10.0.0.7:5432 (role "byte_of_me_admin")';

  afterEach(() => {
    spyOn(logger, 'error').mockRestore();
  });

  it('returns the handler value on success', async () => {
    const res = await handlePublicAction('getThing', async () => ({ id: '1' }));

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ id: '1' });
    }
  });

  it('keeps the caught exception message out of the response', async () => {
    spyOn(logger, 'error').mockImplementation(() => {});

    const res = await handlePublicAction('getThing', async () => {
      throw new Error(LEAKY);
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorMsg).toBe(PUBLIC_ACTION_FAILURE_MESSAGE);
      expect(res.errorMsg).not.toContain('ECONNREFUSED');
      expect(res.errorMsg).not.toContain('10.0.0.7');
      expect(res.errorMsg).not.toContain('byte_of_me_admin');
    }
  });

  it('tags the failure with a code a client can translate', async () => {
    spyOn(logger, 'error').mockImplementation(() => {});

    const res = await handlePublicAction('getThing', async () => {
      throw new Error(LEAKY);
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorCode).toBe('unknown');
    }
  });

  it('logs the real exception message and the action that raised it', async () => {
    const error = spyOn(logger, 'error').mockImplementation(() => {});

    await handlePublicAction('getPaginatedPublicBlogs', async () => {
      throw new Error(LEAKY);
    });

    expect(error).toHaveBeenCalledTimes(1);
    const line = error.mock.calls[0]?.[0] ?? '';
    expect(line).toContain(LEAKY);
    expect(line).toContain('getPaginatedPublicBlogs');
  });

  it('still reports failure, so a caller can tell it from success', async () => {
    spyOn(logger, 'error').mockImplementation(() => {});

    const res = await handlePublicAction('getThing', async () => {
      throw new Error(LEAKY);
    });

    // The generic message must not arrive as `success: true` with empty data:
    // a swallowed failure that renders as an empty page is worse than a leak.
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
  });
});
