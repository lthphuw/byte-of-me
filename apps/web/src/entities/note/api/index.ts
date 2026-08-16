// `publish-rnd-project` is intentionally NOT re-exported here. This barrel is
// reachable from client components (via entities/note/index.ts), and every
// module below is either a `'use server'` action or has no runtime server
// imports (`ensure-note-folder-path.ts` only imports `Prisma` as a type,
// which erases at compile time) — so nothing here drags server-only code into
// the client bundle. `publish-rnd-project` is neither: a plain server module
// — see its own header comment — that value-imports `prisma`, so re-exporting
// it would drag prisma (and pg) into the browser bundle.
// `app/api/rnd/publish/route.ts` imports it by its own path instead.
export * from './archive-note';
export * from './create-note';
export * from './delete-note';
export * from './delete-note-label';
export * from './ensure-note-folder-path';
export * from './get-admin-note-by-id';
export * from './get-archived-notes';
export * from './get-descendant-count';
export * from './get-note-ancestors';
export * from './get-note-children';
export * from './get-note-graph';
export * from './get-note-group-summaries';
export * from './get-note-labels';
export * from './get-note-links';
export * from './get-note-title';
export * from './get-notes-in-group';
export * from './get-notes-page';
export * from './get-space-stats';
export * from './move-note';
export * from './rebuild-link-graph';
export * from './rebuild-search-index';
export * from './relabel-inbound-note-links';
export * from './restore-note';
export * from './scan-stale-note-links';
export * from './search-notes';
export * from './set-note-labels';
export * from './update-note';
