/**
 * The graph's frame while its RSC payload is in flight. The canvas has its
 * own pending state for the *data* (the query in `NoteGraph`); this covers
 * only the gap before the screen itself exists, which without a boundary here
 * would bubble up to `space/loading.tsx` and flash the hub skeleton.
 */
export default function SpaceGraphLoading() {
  return (
    <div className="min-h-0 flex-1 animate-pulse bg-muted/30" aria-hidden />
  );
}
