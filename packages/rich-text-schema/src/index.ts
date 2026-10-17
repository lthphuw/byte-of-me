// `sanitize` and `rich-text-content` are subpaths, not here: they need no TipTap runtime, and
// this barrel does, so a client component importing it would put the schema in a public bundle.
export * from './header-scopes';
export * from './image-base';
export * from './image-ratios';
export * from './numeric-columns';
export * from './references/citation-base';
export * from './references/format';
export * from './references/numbering';
export * from './references/reference-list-base';
export * from './references/types';
export * from './render-extensions';
