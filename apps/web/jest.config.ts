export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  // Scoped to the dependency-free helpers under src/shared/lib. Components and
  // server actions need a DOM, Next's module graph and a database — a very
  // different setup — so they are deliberately out of this suite.
  testMatch: ['<rootDir>/src/shared/lib/**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
