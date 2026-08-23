/**
 * Deliberately empty, and deliberately still here.
 *
 * `loading.tsx` nests INSIDE `layout.tsx`, so this fallback renders in the
 * `{children}` slot — right beside the live workspace. The pages it stands in
 * for now render nothing at all (the workspace moved up into the layout), so
 * a two-pane skeleton here would draw a second, ghost copy of the explorer
 * next to the real one on every single note the author opens.
 *
 * The file earns its place anyway: the boundary is what lets the client
 * router commit a note navigation immediately instead of holding the old URL
 * until the `[id]` payload lands — which matters, because that payload is a
 * `force-dynamic` render with a `getNoteTitle` query behind it. Deleting the
 * file would push the nearest boundary up to `space/loading.tsx` and flash
 * the whole hub skeleton over the workspace instead. First paint is covered
 * where it belongs: the tree draws `NoteTreeSkeleton` from its own query's
 * `isPending`, and the editor its own loading copy.
 */
export default function NotesLoading() {
  return null;
}
