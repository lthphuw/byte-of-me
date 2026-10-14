/**
 * The public tech-stack reads carry the logo's public columns and never the
 * owner's internal user id.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { getAllPublicTechStacks } from './get-all-public-tech-stacks';
import { getPaginatedPublicTechStacks } from './get-paginated-public-tech-stacks';

const findMany = mock();
const count = mock();
Object.defineProperty(prisma, 'techStack', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const NOW = new Date('2026-01-01T00:00:00.000Z');
const LOGO = {
  id: 'm1',
  url: 'https://cdn.example/bun.png',
  width: 32,
  height: 32,
  mimeType: 'image/png',
};
const row = {
  id: 'ts-1',
  createdAt: NOW,
  updatedAt: NOW,
  name: 'Bun',
  slug: 'bun',
  group: 'runtime',
  sortOrder: 1,
  logo: LOGO,
};

describe('getAllPublicTechStacks', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([{ ...row, userId: 'owner-id' }]);
  });

  it('does not return the owner id and selects only public media columns', async () => {
    const res = await getAllPublicTechStacks();

    if (!res.success) throw new Error('unreachable');
    expect(res.data.techStacks).toEqual([row]);
    expect(JSON.stringify(res.data)).not.toContain('owner-id');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          logo: {
            select: {
              id: true,
              url: true,
              width: true,
              height: true,
              mimeType: true,
            },
          },
        },
      })
    );
  });
});

describe('getPaginatedPublicTechStacks', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([row]);
    count.mockReset().mockResolvedValue(1);
  });

  it('selects named columns, so the owner id is never read', async () => {
    const res = await getPaginatedPublicTechStacks({});

    if (!res.success) throw new Error('unreachable');
    expect(res.data.data).toEqual([row]);
    const arg = findMany.mock.calls[0]?.[0] as {
      select: Record<string, unknown>;
      include?: unknown;
    };
    expect(arg.include).toBeUndefined();
    expect(arg.select.userId).toBeUndefined();
    expect(arg.select.logo).toEqual({
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
        mimeType: true,
      },
    });
  });

  it('still answers a page past the cache cap, read live', async () => {
    const res = await getPaginatedPublicTechStacks({ page: 5_000 });

    expect(res.success).toBe(true);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: (5_000 - 1) * 10 })
    );
  });
});
