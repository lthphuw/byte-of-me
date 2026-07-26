export default {
  testEnvironment: 'node',
  clearMocks: true,
  // chalk v5 ships untranspiled ESM — transpile dependencies too.
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      { tsconfig: { allowJs: true, module: 'commonjs', esModuleInterop: true } },
    ],
  },
  transformIgnorePatterns: [],
};
