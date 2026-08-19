import { Skeleton } from '@byte-of-me/ui';

// Same classes as `ContactInfos` — a skeleton that lays out differently is the
// layout shift it exists to prevent. No `animate-pulse` here: every `Skeleton`
// brings its own, and a second one on the container ran out of phase with them.
export function ContactInfosLoading() {
  return (
    <div className="w-full space-y-4 md:space-y-6">
      <Skeleton className="h-7 w-32" />
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
