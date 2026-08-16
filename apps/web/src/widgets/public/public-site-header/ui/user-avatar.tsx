'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';
import type { Account } from '@/widgets/public/public-site-header/lib/use-account';

/**
 * The signed-in person, as a circle.
 *
 * It measured 40x36 before — an ellipse. The trigger was a `<Button>` with
 * `size-10 rounded-full` and no `size` prop, so the variant's `h-9` rode along
 * and won on height; tailwind-merge does not know `size-*` collapses
 * `h-*`/`w-*`. Hence one element with one width and one height and no variant
 * system underneath to disagree with them.
 *
 * `AvatarImage` falls back to initials on a load error, so a dead URL degrades
 * to letters rather than a hole.
 */
export function UserAvatar({
  account,
  className,
}: {
  account: Account;
  className?: string;
}) {
  return (
    <Avatar
      className={cn(
        'size-9 border border-border/60 bg-muted text-muted-foreground',
        // The ring is the affordance: this sits alone with no label and no
        // chevron, so something has to say it can be pressed.
        'ring-0 ring-foreground/15 ring-offset-2 ring-offset-background transition-[box-shadow,transform] duration-200',
        'group-hover:ring-2 group-focus-visible:ring-2',
        className
      )}
    >
      {account.image && (
        <AvatarImage src={account.image} alt="" className="object-cover" />
      )}
      <AvatarFallback className="bg-transparent text-xs font-semibold tracking-wide">
        {account.initials}
      </AvatarFallback>
    </Avatar>
  );
}
