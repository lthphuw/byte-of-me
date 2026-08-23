/**
 * What this spec defends: the route is the ONLY address a day photo has, so
 * the guard here is a security boundary and not a convenience. No session is
 * 401; someone else's photo is 404 and not 403 — a 403 would confirm the id
 * exists. The response is labelled from the ROW's mimeType, never from what S3
 * reports, and an SVG is refused outright.
 */
import { prisma } from '@byte-of-me/db';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';

import type * as RouteModule from './route';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const getFile = mock(async () => ({
  body: new ReadableStream(),
  contentType: 'application/octet-stream',
  contentLength: 1234,
}));
mock.module('@/shared/api/s3-storage-api', () => ({
  privateStorage: { getFile },
}));

let GET: typeof RouteModule.GET;

beforeAll(async () => {
  ({ GET } = await import('./route'));
});

const findUnique = mock();
Object.defineProperty(prisma, 'dayPhoto', {
  value: { findUnique },
  writable: true,
  configurable: true,
});

const params = (id: string) => ({ params: Promise.resolve({ id }) });

afterAll(() => {
  // Mandatory: the stub holds one mutable identity for the whole process, so
  // a spec that leaves a non-owner (or no user) behind breaks every later
  // file. See `set-test-user.test-helper.ts`.
  resetTestUser();
});

beforeEach(() => {
  resetTestUser();
  findUnique.mockReset();
  getFile.mockClear();
});

describe('GET /api/health/photos/[id]', () => {
  it("serves the bytes with the row's own content type", async () => {
    findUnique.mockResolvedValue({
      fileKey: 'k1',
      mimeType: 'image/jpeg',
      ownerId: 'admin-1',
    });

    const res = await GET(new Request('http://x'), params('photo-1'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Cache-Control')).toInclude('private');
  });

  it('answers 401 with no session, without reading the database', async () => {
    setTestUser(null);

    const res = await GET(new Request('http://x'), params('photo-1'));

    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("answers 404 for another owner's photo, not 403", async () => {
    findUnique.mockResolvedValue({
      fileKey: 'k1',
      mimeType: 'image/jpeg',
      ownerId: 'someone-else',
    });

    const res = await GET(new Request('http://x'), params('photo-1'));

    expect(res.status).toBe(404);
    expect(getFile).not.toHaveBeenCalled();
  });

  it('refuses to serve a type outside the allowlist', async () => {
    findUnique.mockResolvedValue({
      fileKey: 'k1',
      mimeType: 'image/svg+xml',
      ownerId: 'admin-1',
    });

    const res = await GET(new Request('http://x'), params('photo-1'));

    expect(res.status).toBe(415);
    expect(getFile).not.toHaveBeenCalled();
  });
});
