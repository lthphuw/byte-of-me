export default {
  testEnvironment: 'node',
  clearMocks: true,
  // Scoped to the dependency-free helpers under src/lib. The components pull in
  // React, Radix and Tiptap UI, which need a DOM environment — keep this suite
  // fast and free of that. (render-pipeline.spec.ts is allowed: generateHTML is
  // pure node.)
  testMatch: ['<rootDir>/src/lib/**/*.spec.ts'],
  // lowlight/tiptap and friends ship untranspiled ESM; ts-jest converts them
  // to CJS so this suite can stay on the default runner.
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      { tsconfig: { allowJs: true, module: 'commonjs', esModuleInterop: true } },
    ],
  },
  // Transpile everything the suite touches — several tiptap/lowlight deps ship
  // untranspiled ESM and enumerating them is a losing game. The suite is small,
  // so the extra transform cost is negligible.
  transformIgnorePatterns: [],
};
