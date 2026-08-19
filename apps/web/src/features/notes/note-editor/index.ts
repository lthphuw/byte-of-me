// The queue that resends notes whose saves never landed. Exported from the
// slice root because the WIDGET mounts it — it has to outlive any one note's
// editor, and it needs the id of whichever note is currently open so it can
// leave that one to the editor's own autosave.
export * from './lib/use-note-sync-queue';
export * from './ui';
