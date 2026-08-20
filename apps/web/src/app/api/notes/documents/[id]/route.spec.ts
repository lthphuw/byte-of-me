/**
 * This route is the only address a note attachment has, and the private
 * bucket's entire value rests on it. So what is pinned here is the boundary,
 * not the plumbing: who is refused, what a refusal reveals, and the exact
 * headers the bytes leave with.
 *
 * Two of those headers are load-bearing. `Content-Type` is ours and never the
 * bucket's — a stored object claiming `text/html` must not become a
 * same-origin script — and `Content-Disposition` carries a user-supplied
 * title, which is the one place a value under an attacker's control is
 * written into a header.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import { contentDispositionFor, GET } from './route';

import { privateStorage } from '@/shared/api/s3-storage-api';
import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

// Prisma 7 synthesizes a fresh function on every delegate method access, so
// `spyOn` is bypassed — the whole delegate is replaced instead (AGENTS §10).
const findUnique = mock();
Object.defineProperty(prisma, 'noteDocument', {
  value: { findUnique },
  writable: true,
  configurable: true,
});

// `privateStorage` is a `Storage` instance; an own property shadows the
// prototype method the route calls. No S3 client is ever reached.
const getFile = mock();
Object.defineProperty(privateStorage, 'getFile', {
  value: getFile,
  writable: true,
  configurable: true,
});

/** The default identity of the auth stub is the site owner, id `admin-1`. */
const OWNED_ROW = {
  title: 'report',
  fileKey: 'users/admin-1/notes/note-1/abc.pdf',
  ownerId: 'admin-1',
};

const streamOf = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });

const invoke = (id = 'doc-1') =>
  GET(new Request(`https://example.com/api/notes/documents/${id}`), {
    params: Promise.resolve({ id }),
  });

/** The `filename*` parameter's value, decoded back to the name it carries. */
const decodeRfc5987 = (disposition: string) => {
  const match = /filename\*=UTF-8''([^;]*)/.exec(disposition);
  if (!match?.[1]) throw new Error(`no filename* in: ${disposition}`);
  return decodeURIComponent(match[1]);
};

/** The quoted `filename=` fallback's value. */
const asciiFallback = (disposition: string) => {
  const match = /filename="([^"]*)"/.exec(disposition);
  if (match?.[1] === undefined) {
    throw new Error(`no quoted filename in: ${disposition}`);
  }
  return match[1];
};

describe('GET /api/notes/documents/[id]', () => {
  beforeAll(() => {
    // The 404/502 paths log; silenced so a passing run stays readable.
    spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    spyOn(logger, 'error').mockRestore();
    // Mandatory: the stub holds one mutable identity for the whole process,
    // so a spec that leaves a non-owner behind breaks every later file.
    resetTestUser();
  });

  beforeEach(() => {
    resetTestUser();
    findUnique.mockReset().mockResolvedValue(OWNED_ROW);
    getFile.mockReset().mockResolvedValue({
      body: streamOf('%PDF-1.7'),
      // Deliberately wrong, and deliberately ignored — see the 200 test.
      contentType: 'text/html',
      contentLength: 8,
    });
  });

  it('refuses an anonymous caller before it reads the row', async () => {
    setTestUser(null);

    const res = await invoke();

    expect(res.status).toBe(401);
    // The guard runs first, so an id cannot be probed for existence without a
    // session at all.
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('refuses a signed-in caller who is not the site owner', async () => {
    setTestUser({ id: 'user-2', role: 'USER', email: 'someone@else.test' });

    const res = await invoke();

    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  // The core disclosure rule. 403 here would confirm that this id names a
  // real attachment belonging to somebody, which is exactly the fact the
  // private bucket exists to withhold.
  it('answers 404, not 403, for a row owned by somebody else', async () => {
    findUnique.mockResolvedValue({ ...OWNED_ROW, ownerId: 'someone-else' });

    const res = await invoke();

    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
    // And the bytes are never fetched, so the foreign object is not even read
    // into this process.
    expect(getFile).not.toHaveBeenCalled();
  });

  it('answers 404 for an id that names no row, exactly like a foreign row', async () => {
    findUnique.mockResolvedValue(null);
    const missing = await invoke('nope');

    findUnique.mockResolvedValue({ ...OWNED_ROW, ownerId: 'someone-else' });
    const foreign = await invoke();

    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe(await foreign.text());
  });

  it('answers 404 when the object has no body, rather than streaming nothing', async () => {
    getFile.mockResolvedValue({
      body: undefined,
      contentType: 'application/pdf',
      contentLength: undefined,
    });

    const res = await invoke();

    expect(res.status).toBe(404);
  });

  it('answers 404 when the object is gone from the bucket', async () => {
    getFile.mockRejectedValue(
      Object.assign(new Error('The specified key does not exist.'), {
        name: 'NoSuchKey',
        $metadata: { httpStatusCode: 404 },
      })
    );

    const res = await invoke();

    expect(res.status).toBe(404);
  });

  // Distinguished from the case above on purpose: telling a reader their file
  // no longer exists because S3 had a bad minute invites them to delete a row
  // that is perfectly fine.
  it('answers 502, not 404, when the bucket fails to answer at all', async () => {
    getFile.mockRejectedValue(new Error('connection reset'));

    const res = await invoke();

    expect(res.status).toBe(502);
  });

  it('streams the bytes with the exact header set', async () => {
    const res = await invoke();

    expect(res.status).toBe(200);
    // Ours, hardcoded. The stub reported `text/html`; echoing that would let
    // a mislabelled object execute as a same-origin script on this domain.
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe('private, max-age=3600');
    expect(res.headers.get('content-length')).toBe('8');
    expect(res.headers.get('content-disposition')).toBe(
      `inline; filename="report.pdf"; filename*=UTF-8''report.pdf`
    );
    expect(await res.text()).toBe('%PDF-1.7');
  });

  it('reads the key from the row, never from the request', async () => {
    await invoke('doc-1');

    expect(getFile).toHaveBeenCalledWith('users/admin-1/notes/note-1/abc.pdf');
  });

  it('omits Content-Length when the bucket did not report one', async () => {
    getFile.mockResolvedValue({
      body: streamOf('%PDF-1.7'),
      contentType: 'application/pdf',
      contentLength: undefined,
    });

    const res = await invoke();

    expect(res.headers.get('content-length')).toBeNull();
  });

  // The header-injection case. `title` is whatever the uploader named the
  // file, so a CRLF in it must not be able to end `Content-Disposition` and
  // start a header of the attacker's choosing, and a quote must not be able
  // to close the quoted-string early.
  it('neutralises a title carrying a quote, a newline and Vietnamese diacritics', async () => {
    findUnique.mockResolvedValue({
      ...OWNED_ROW,
      title: 'He said "hi"\r\nX-Injected: yes — Tài liệu',
    });

    const res = await invoke();
    const disposition = res.headers.get('content-disposition') ?? '';

    expect(res.status).toBe(200);
    // Nothing that could terminate this header survived.
    expect(disposition).not.toMatch(/[\r\n]/);
    // The fallback is a quoted-string, so it must be printable ASCII with no
    // quote or backslash left to break out of it.
    expect(asciiFallback(disposition)).toBe(
      'He said hi X-Injected: yes Tai lieu.pdf'
    );
    expect(asciiFallback(disposition)).toMatch(/^[\x20-\x7e]*$/);
    // The real name still reaches a modern client intact, minus the control
    // characters — that is what `filename*` is for.
    expect(decodeRfc5987(disposition)).toBe(
      'He said "hi" X-Injected: yes — Tài liệu.pdf'
    );
    // And it is genuinely percent-encoded rather than passed through: the
    // quote and the `ệ` are escaped in the header text itself.
    expect(disposition).toContain('%22');
    expect(disposition).toContain('%E1%BB%87');
    expect(disposition).not.toContain('ệ');
  });
});

describe('contentDispositionFor', () => {
  it('escapes the four characters encodeURIComponent leaves behind', async () => {
    // `'`, `(`, `)` and `*` are all outside RFC 5987's `attr-char`, and
    // `encodeURIComponent` does not touch any of them.
    const disposition = contentDispositionFor(`a'b(c)*d.pdf`);

    expect(disposition).toContain(`filename*=UTF-8''a%27b%28c%29%2Ad.pdf`);
    expect(decodeRfc5987(disposition)).toBe(`a'b(c)*d.pdf`);
  });

  it('falls back to a usable name when the title sanitises down to nothing', () => {
    // Every character of this title is unrepresentable in a quoted-string, so
    // the ASCII form would otherwise be the bare extension `.pdf` — a hidden
    // file, not a document.
    const disposition = contentDispositionFor('"""');

    expect(asciiFallback(disposition)).toBe('document.pdf');
    // The generic fallback is only the fallback: the real title still travels.
    expect(decodeRfc5987(disposition)).toBe('""".pdf');
  });

  it('does not double the extension on a title that already has one', () => {
    expect(asciiFallback(contentDispositionFor('notes.PDF'))).toBe('notes.PDF');
    expect(asciiFallback(contentDispositionFor('notes'))).toBe('notes.pdf');
  });
});
