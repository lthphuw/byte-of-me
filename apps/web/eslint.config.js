// eslint.config.js
import js from '@eslint/js/src/index.js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      'no-empty-object-type': 'off',
      "@typescript-eslint/no-explicit-any": "off",
    },
    languageOptions: {
      parserOptions: {},
    },
  },
];
