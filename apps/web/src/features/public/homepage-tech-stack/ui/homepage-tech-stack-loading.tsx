import { Skeleton } from '@byte-of-me/ui';

// Fixed widths, not random ones: this renders on the server as a Suspense
// fallback and randomness would mismatch on hydration.
const PILL_WIDTHS = ['w-24', 'w-32', 'w-28', 'w-36', 'w-24', 'w-32'];

export function HomepageTechStackLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <Skeleton className="h-7 w-32 md:h-9 md:w-44" />
      <div className="flex flex-wrap gap-2">
        {PILL_WIDTHS.map((width, i) => (
          <Skeleton key={i} className={`h-10 ${width} rounded-lg`} />
        ))}
      </div>
    </div>
  );
}
