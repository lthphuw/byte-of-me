import { describe, expect, it } from 'bun:test';

import { rndPublishSchema } from './rnd-publish-schema';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    project: 'face-anti-spoofing',
    title: 'Face Anti-Spoofing',
    notesRoot: 'R&D/face-anti-spoofing',
    files: [
      {
        path: '00-overview.md',
        // Cast so later tests can reassign this field to differently-shaped
        // frontmatter objects — the schema, not TypeScript, is what should
        // constrain their contents.
        frontmatter: { title: 'Overview', type: 'overview', status: 'active', tags: ['cv'] } as Record<
          string,
          unknown
        >,
        markdown: '# Overview\n',
      },
    ],
    deleted: [],
    ...overrides,
  };
}

describe('rndPublishSchema', () => {
  it('accepts a well-formed payload', () => {
    expect(rndPublishSchema.safeParse(payload()).success).toBe(true);
  });

  it('defaults `deleted` to an empty array', () => {
    const parsed = rndPublishSchema.parse(payload({ deleted: undefined }));
    expect(parsed.deleted).toEqual([]);
  });

  it('rejects a project slug that is not a slug', () => {
    expect(rndPublishSchema.safeParse(payload({ project: 'Face Spoofing!' })).success).toBe(false);
  });

  it('rejects a path that escapes the project', () => {
    const bad = payload();
    bad.files[0].path = '../../etc/passwd.md';
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a path that is not markdown', () => {
    const bad = payload();
    bad.files[0].path = 'notes.txt';
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an absolute path', () => {
    const bad = payload();
    bad.files[0].path = '/00-overview.md';
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects author-supplied rnd_path, which the server owns', () => {
    const bad = payload();
    bad.files[0].frontmatter = { title: 'Overview', rnd_path: 'somewhere-else.md' };
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects author-supplied rnd_project, which the server owns', () => {
    const bad = payload();
    bad.files[0].frontmatter = { title: 'Overview', rnd_project: 'someone-elses-project' };
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts `generated`, which the results generator writes', () => {
    const ok = payload();
    ok.files[0].frontmatter = { title: 'Results', generated: true };
    expect(rndPublishSchema.safeParse(ok).success).toBe(true);
  });

  it('rejects a nested frontmatter value — properties holds scalars only', () => {
    const bad = payload();
    bad.files[0].frontmatter = { title: 'Overview', nested: { a: 1 } };
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  it('requires a title in every file', () => {
    const bad = payload();
    bad.files[0].frontmatter = { type: 'overview' };
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  // A mid-path variant, not a leading "..": the leading-alphanumeric regex
  // already rejects a path starting with "..", so a test that only ever
  // used that shape would never actually reach the ".." refine below.
  it('rejects a deleted path that escapes the project', () => {
    expect(
      rndPublishSchema.safeParse(payload({ deleted: ['assets/../../../etc/passwd.md'] })).success,
    ).toBe(false);
  });

  // The regex alone rejects a *leading* "..", since the first character must
  // be alphanumeric — but a mid-path traversal like this one satisfies the
  // regex and is only caught by the ".." refine. Without that refine, this
  // payload would be accepted and a client could climb out of the project.
  it('rejects a path that escapes the project via a mid-path ".." segment', () => {
    const bad = payload();
    bad.files[0].path = 'assets/../../../etc/passwd.md';
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  // The regex permits repeated slashes (nothing in the character class rules
  // them out), and the ".." refine doesn't fire either — split('/') on this
  // string never produces the literal segment "..". The `//` refine is the
  // only thing standing between this payload and acceptance.
  it('rejects a path with an empty path segment (double slash)', () => {
    const bad = payload();
    bad.files[0].path = 'assets//file.md';
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  // notesRoot is combined with each file's path server-side to build the
  // write target (see rndFilePath's doc comment) — a traversing notesRoot is
  // exactly as dangerous as a traversing file path, and nothing else in the
  // schema constrains it.
  it('rejects a notesRoot that contains a ".." segment', () => {
    expect(rndPublishSchema.safeParse(payload({ notesRoot: '../../etc' })).success).toBe(false);
  });

  // Only the "title absent" branch is covered elsewhere. A whitespace-only
  // title is `typeof === 'string'`, so without the `.trim().length > 0`
  // clause specifically, this would pass straight through and land as a
  // blank note title in the vault.
  it('rejects a whitespace-only frontmatter title', () => {
    const bad = payload();
    bad.files[0].frontmatter = { title: '   ' };
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  // These bounds exist so that a note which publishes is always a note that
  // can be edited afterward: `updateNoteSchema` (note-schema.ts) caps a
  // property value at 500 characters, a property key at 60, and the whole
  // record at 40 entries. A published note outside any of those bounds fails
  // the properties panel's own save the moment an author touches it.

  it('rejects a frontmatter string value over the 500-character bound the app enforces on a saved property', () => {
    const bad = payload();
    bad.files[0].frontmatter = { title: 'Overview', summary: 'x'.repeat(501) };
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a frontmatter string value at exactly the 500-character bound', () => {
    const ok = payload();
    ok.files[0].frontmatter = { title: 'Overview', summary: 'x'.repeat(500) };
    expect(rndPublishSchema.safeParse(ok).success).toBe(true);
  });

  it('rejects a frontmatter key over the 60-character bound the app enforces on a property key', () => {
    const bad = payload();
    bad.files[0].frontmatter = { title: 'Overview', [`k${'x'.repeat(60)}`]: 'v' };
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  // Every array element individually respects the 500-char per-value bound,
  // but the array is flattened to one joined string server-side
  // (`value.join(', ')`) — bounding the elements alone would still let, say,
  // 50 × short tags join past 500 characters. This exercises the joined
  // length, not the per-element one.
  it('rejects a tags array whose JOINED length exceeds 500, even though every element is individually short', () => {
    const bad = payload();
    // 50 elements of "abcdefghij" (10 chars) plus 49 ", " separators
    // = 500 + 98 = 598 characters once joined — over the bound even though
    // no single element is anywhere close to 500.
    bad.files[0].frontmatter = { title: 'Overview', tags: Array(50).fill('abcdefghij') };
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a tags array whose joined length is within the 500-character bound', () => {
    const ok = payload();
    ok.files[0].frontmatter = { title: 'Overview', tags: ['cv', 'baseline'] };
    expect(rndPublishSchema.safeParse(ok).success).toBe(true);
  });

  // `title` and `status` own columns and are dropped before the write
  // (`publish-rnd-project.ts`'s COLUMN_KEYS); `rnd_path` and `rnd_project`
  // are added unconditionally as the identity. So the frontmatter may carry
  // at most 38 keys beyond title/status, not 40 — 38 + the 2 identity keys
  // is exactly updateNoteSchema's 40-entry cap on `Note.properties`.
  it('rejects frontmatter whose eventual properties record would exceed the app-editable 40-entry cap', () => {
    const bad = payload();
    const extra = Object.fromEntries(Array.from({ length: 39 }, (_, i) => [`key${i}`, 'v']));
    bad.files[0].frontmatter = { title: 'Overview', status: 'active', ...extra };
    expect(rndPublishSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts frontmatter at exactly the 38-non-column-key boundary', () => {
    const ok = payload();
    const extra = Object.fromEntries(Array.from({ length: 38 }, (_, i) => [`key${i}`, 'v']));
    ok.files[0].frontmatter = { title: 'Overview', status: 'active', ...extra };
    expect(rndPublishSchema.safeParse(ok).success).toBe(true);
  });
});
