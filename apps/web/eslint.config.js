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
    },
    languageOptions: {
      parserOptions: {},
    },
  },
];
