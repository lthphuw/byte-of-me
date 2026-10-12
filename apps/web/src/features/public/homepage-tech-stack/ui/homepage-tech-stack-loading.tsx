import { Skeleton } from '@byte-of-me/ui';

// Fixed widths, not random ones: this renders on the server as a Suspense
// fallback and randomness would mismatch on hydration.
const PILL_WIDTHS = ['w-16', 'w-24', 'w-20', 'w-28', 'w-16', 'w-24'];

// Each pill has the classes of `TechStackBadge`: a bordered row with a 20px text line.
export function HomepageTechStackLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <Skeleton className="h-7 w-32 md:h-9 md:w-44" />
      <div className="flex flex-wrap gap-2">
        {PILL_WIDTHS.map((width, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border px-3 py-2"
          >
            <Skeleton className={`h-5 ${width}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
