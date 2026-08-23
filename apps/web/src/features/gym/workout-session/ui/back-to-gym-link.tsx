'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

/**
 * The way out of a session, in the two shapes this route needs it.
 *
 * A `Link`, not a `router.push` on a button, so Next prefetches the gym screen
 * and the back tap is instant — which matters more here than anywhere else in
 * the module, because it is the tap taken while walking out of a building with
 * no signal.
 *
 * `guard` is what makes leaving with unsent sets stoppable. It returns whether
 * the navigation may proceed; a `false` cancels the default and leaves the
 * caller to put its own question on screen. The link stays a link either way,
 * so a middle-click, a long-press "open in new tab" and the prefetch all still
 * behave — a button pretending to be a link loses all three.
 */
export function BackToGymLink({
  compact = false,
  guard,
}: {
  /** The live header is a 44px strip with a title and two controls on it;
   *  there is no room for the word. The review view has a whole page and uses
   *  it. */
  compact?: boolean;
  guard?: () => boolean;
}) {
  const t = useTranslations('dashboard.health.workout');

  return (
    <Link
      href="/space/gym"
      aria-label={compact ? t('back') : undefined}
      onClick={(event) => {
        if (guard && !guard()) event.preventDefault();
      }}
      className={cn(
        'inline-flex items-center gap-2 text-sm transition-colors duration-200',
        compact
          ? 'size-11 shrink-0 justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground'
          : 'min-h-11 text-muted-foreground underline underline-offset-4 hover:text-foreground'
      )}
    >
      <ArrowLeft aria-hidden className="size-4 shrink-0" />
      {compact ? null : t('back')}
    </Link>
  );
}
