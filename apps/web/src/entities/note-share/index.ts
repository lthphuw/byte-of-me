// `./lib` is deliberately absent. `resolve-note-access.ts` is `server-only`,
// and starring it in here would drag that marker into any client component
// that reaches for a query key. The api layer imports it by its own path.
export * from './api';
export * from './model';
