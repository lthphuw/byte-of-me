export default {
  testEnvironment: 'node',
  clearMocks: true,
  // @byte-of-me/logger -> chalk v5 is untranspiled ESM; transpile deps too.
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      { tsconfig: { allowJs: true, module: 'commonjs', esModuleInterop: true } },
    ],
  },
  transformIgnorePatterns: [],
};
