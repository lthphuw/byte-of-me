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

  it('rejects a deleted path that escapes the project', () => {
    expect(rndPublishSchema.safeParse(payload({ deleted: ['../x.md'] })).success).toBe(false);
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
});
