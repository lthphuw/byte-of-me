/** The public tech-stack read carries only the logo's public columns, never the owner's id. */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

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
