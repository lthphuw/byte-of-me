import { SpaceHub } from '@/widgets/space/space-hub';
import { SpaceNavTrigger } from '@/widgets/space/space-shell';

/**
 * The hub is an RSC that fetches its own stats; while it does, the route's
 * `loading.tsx` shows the matching skeleton. No extra `<Suspense>` here — the
 * page IS the async boundary.
 */
export default function SpacePage() {
  return <SpaceHub navSlot={<SpaceNavTrigger className="lg:hidden" />} />;
}
