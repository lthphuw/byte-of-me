describe('Prisma module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test';
  });

  it('should create prisma client', () => {
    // ...
  });

});
