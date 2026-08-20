// `./lib` is deliberately absent, the way `note-share`'s barrel omits its own:
// `storage-key.ts` describes where bytes live in a bucket, which is the server
// action's business and nobody else's. Starring it here would put a key
// generator within reach of a client component that has no address to use it
// with.
//
// `./query` IS exported, unlike the media entity's — every consumer of this
// slice is the same Files panel, and making it import the hooks by deep path
// while the types come from the barrel buys nothing. The hooks are
// `'use client'`, so a Server Component reaching the barrel for
// `NoteDocumentSummary` gets a client reference, not their bodies.
export * from './api';
export * from './model';
export * from './query';
