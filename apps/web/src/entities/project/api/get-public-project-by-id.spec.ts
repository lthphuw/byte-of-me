/**
 * The id becomes a cache key and tag and reaches a `where`, so it must be a
 * plain id; and the tech-stack rows leave without the owner's internal user id.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getPublicProjectById } from './get-public-project-by-id';

const findUnique = mock();
Object.defineProperty(prisma, 'project', {
  value: { findUnique },
  writable: true,
  configurable: true,
});

const PROJECT_ID = 'cl9ebqhxk00003b600tymydho';
const NOW = new Date('2026-01-01T00:00:00.000Z');

const projectRow = {
  id: PROJECT_ID,
  slug: 'byte-of-me',
  startDate: NOW,
  endDate: null,
  githubLink: null,
  liveLink: null,
  isPublished: true,
  translations: [
    {
      language: 'en',
      title: 'Byte of Me',
      description: 'Plain',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  techStacks: [
    {
      techStack: {
        id: 'ts-1',
        createdAt: NOW,
        updatedAt: NOW,
        name: 'Bun',
        slug: 'bun',
        group: 'runtime',
        sortOrder: 1,
        logo: null,
        userId: 'owner-internal-id',
      },
    },
  ],
  tags: [],
  coauthors: [],
};

describe('getPublicProjectById', () => {
  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue(projectRow);
  });

  it.each([
    ['an id of the wrong shape', 'not-a-cuid'],
    ['a Prisma filter object', { not: '' }],
    ['an empty id', ''],
    ['an oversized id', `c${'a'.repeat(5_000)}`],
  ])('refuses %s without querying', async (_label, id) => {
    const res = await getPublicProjectById(id as unknown as string);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('does not return the tech stack owner id', async () => {
    const res = await getPublicProjectById(PROJECT_ID);

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data?.techStacks[0]?.name).toBe('Bun');
    expect(JSON.stringify(res.data)).not.toContain('owner-internal-id');
  });

  it('selects only the public media columns for a tech stack logo', async () => {
    await getPublicProjectById(PROJECT_ID);

    const arg = findUnique.mock.calls[0]?.[0] as {
      include: {
        techStacks: {
          include: { techStack: { include: { logo: unknown } } };
        };
      };
    };
    expect(arg.include.techStacks.include.techStack.include.logo).toEqual({
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
        mimeType: true,
      },
    });
  });
});
