/**
 * The generated client and the pg adapter are mocked: these tests cover the
 * wiring in src/index.ts (adapter passed in, query logging attached, global
 * singleton reuse) — not Prisma itself.
 */
const prismaCtor = jest.fn();
const onSpy = jest.fn();

jest.mock('../src/generated/prisma/client', () => ({
  PrismaClient: class {
    constructor(options: unknown) {
      prismaCtor(options);
    }
    $on = onSpy;
  },
}));

const adapterCtor = jest.fn();
jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(config: unknown) {
      adapterCtor(config);
    }
  },
}));

describe('Prisma module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
    // Drop the cached singleton between tests.
    delete (global as { prisma?: unknown }).prisma;
  });

  it('creates the client through the pg driver adapter', () => {
    jest.isolateModules(() => {
      const { createPrismaClient } = require('../src');
      createPrismaClient();
    });

    expect(adapterCtor).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
    });
    expect(prismaCtor).toHaveBeenCalledWith(
      expect.objectContaining({ adapter: expect.anything() })
    );
  });

  it('subscribes to query events for logging', () => {
    jest.isolateModules(() => {
      const { createPrismaClient } = require('../src');
      createPrismaClient();
    });

    expect(onSpy).toHaveBeenCalledWith('query', expect.any(Function));
  });

  it('reuses one client across module reloads outside production', () => {
    jest.isolateModules(() => {
      require('../src');
    });
    jest.isolateModules(() => {
      require('../src');
    });

    // Module evaluated twice, but the global cache means one construction.
    expect(prismaCtor).toHaveBeenCalledTimes(1);
  });
});
