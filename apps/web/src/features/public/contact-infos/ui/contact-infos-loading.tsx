import { Skeleton } from '@byte-of-me/ui';

// Same classes as `ContactInfos`' channel rows, so each row keeps its height: a
// bordered row, a 40px icon box and two lines of text. No `animate-pulse` here:
// every `Skeleton` brings its own, and a second one on the container ran out of phase with them.
export function ContactInfosLoading() {
  return (
    <div className="w-full space-y-3 md:space-y-6">
      <Skeleton className="h-7 w-32" />
      <div className="grid grid-cols-1 gap-3 md:gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-border px-4 py-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
