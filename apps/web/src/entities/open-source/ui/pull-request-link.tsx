import { badgeVariants } from '@byte-of-me/ui';
import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

/**
 * The `View` badge on a merged PR: GitHub in a new tab. `before:` is a 44px hit area around the
 * 22px chip; it adds no height. Shared by the home PR list and the `/projects` ledger.
 */
export function PullRequestLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        badgeVariants({ variant: 'outline', interactive: true }),
        'relative shrink-0 gap-1 text-primary transition-colors hover:bg-primary/10 before:absolute before:inset-x-0 before:-inset-y-3',
        className
      )}
    >
      {label}
      <ArrowUpRight aria-hidden className="size-3" />
    </a>
  );
}
