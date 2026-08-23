// `get-workspace-settings` is intentionally NOT re-exported here, for exactly
// the reason `entities/note/api/index.ts` gives about `publish-rnd-project`
// and `entities/user-profile` gives about `get-owner-display-name`: this
// barrel is client-reachable, and that module is a plain server module (no
// `'use server'`, so that React's `cache()` can wrap it) which value-imports
// `prisma`. Re-exporting it would drag prisma — and pg — into the browser
// bundle. `space/layout.tsx` imports it by its own path.
export * from './get-image-compression-settings';
export * from './update-workspace-settings';
