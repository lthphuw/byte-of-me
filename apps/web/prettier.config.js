/** @type {import('prettier').Config} */
export const endOfLine = 'lf';
export const semi = true;
export const singleQuote = true;
export const tabWidth = 2;
export const trailingComma = 'es5';
export const importOrder = [
  '^(react/(.*)$)|^(react$)',
  '^(next/(.*)$)|^(next$)',
  '<THIRD_PARTY_MODULES>',
  '',
  '^types$',
  '^@/env(.*)$',
  '^@/types/(.*)$',
  '^@/config/(.*)$',
  '^@/lib/(.*)$',
  '^@/hooks/(.*)$',
  '^@/components/ui/(.*)$',
  '^@/components/(.*)$',
  '^@/styles/(.*)$',
  '^@/app/(.*)$',
  '',
  '^[./]',
];
export const importOrderSeparation = false;
export const importOrderSortSpecifiers = true;
export const importOrderBuiltinModulesToTop = true;
export const importOrderParserPlugins = [
  'typescript',
  'jsx',
  'decorators-legacy',
];
export const importOrderMergeDuplicateImports = true;
export const importOrderCombineTypeAndValueImports = true;
export const plugins = ['@ianvs/prettier-plugin-sort-imports'];
