/**
 * The generated client and the pg adapter are injected via `createPrismaClient`'s
 * dependency seam: these tests cover the wiring in src/index.ts (adapter passed in,
 * query logging attached, global singleton reuse) — not Prisma itself.
 */
import { describe, expect, it, mock } from 'bun:test';

import { createPrismaClient, prisma } from '../src';

describe('createPrismaClient', () => {
  it('creates the client through the pg driver adapter', () => {
    const adapterCtor = mock();
    const clientCtor = mock();

    class FakeAdapter {
      constructor(config: unknown) {
        adapterCtor(config);
      }
    }
    class FakeClient {
      $on = mock();
      constructor(options: unknown) {
        clientCtor(options);
      }
    }

    createPrismaClient({
      PrismaPg: FakeAdapter as never,
      PrismaClient: FakeClient as never,
    });

    expect(adapterCtor).toHaveBeenCalledWith({
      connectionString: process.env.DATABASE_URL,
    });
    expect(clientCtor).toHaveBeenCalledWith(
      expect.objectContaining({ adapter: expect.anything() })
    );
  });

  it('subscribes to query events outside production', () => {
    const onSpy = mock();

    class FakeAdapter {}
    class FakeClient {
      $on = onSpy;
    }

    createPrismaClient({
      PrismaPg: FakeAdapter as never,
      PrismaClient: FakeClient as never,
    });

    expect(onSpy).toHaveBeenCalledWith('query', expect.any(Function));
  });

  it('caches one client on the global outside production', () => {
    expect((global as { prisma?: unknown }).prisma).toBe(prisma);
  });
});
