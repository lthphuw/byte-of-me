'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  menuTransition,
  menuVariants,
} from '@byte-of-me/ui';
import { AnimatePresence, m } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAccount } from '@/widgets/public/public-site-header/lib/use-account';
import { UserAvatar } from '@/widgets/public/public-site-header/ui/user-avatar';

/**
 * The account control, for a pointer. Desktop only; a phone gets
 * `PublicHeaderAccountPanel` at the foot of the nav menu.
 *
 * A plain `button`, not the `Button` component — the variant system's `h-9` is
 * what made the previous trigger an ellipse. `group` lets the avatar's ring
 * react to hover and focus without declaring either twice.
 */
export function UserActionToggle() {
  const t = useTranslations('global.userToggle');
  const { account, signOutEverywhere } = useAccount();

  if (!account) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('openAccount')}
          className="group flex size-9 items-center justify-center rounded-full focus-visible:outline-none"
        >
          <UserAvatar account={account} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-60 overflow-hidden shadow-lg container-bg"
        forceMount
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            variants={menuVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={menuTransition}
          >
            {/* Repeated in full: the trigger is two letters, and "which
                account is this" is worth answering before offering to end the
                session. */}
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <UserAvatar account={account} />
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium leading-none">
                    {account.name}
                  </p>
                  <p className="truncate text-xs leading-none text-muted-foreground">
                    {account.email}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => void signOutEverywhere()}
              className="cursor-pointer gap-2"
            >
              <LogOut className="size-4" />
              {t('signOut')}
            </DropdownMenuItem>
          </m.div>
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
