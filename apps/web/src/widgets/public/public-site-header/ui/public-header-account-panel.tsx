'use client';

import { Skeleton } from '@byte-of-me/ui-primitives';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAccount } from '@/widgets/public/public-site-header/lib/use-account';
import { UserAvatar } from '@/widgets/public/public-site-header/ui/user-avatar';

/**
 * Account row at the foot of the mobile nav: three targets and a wordmark overflowed the
 * phone header (islands measured 396px of 500px). Email, not name: `useAccount` falls back to
 * the role, and "Admin" identifies nobody. Skeleton while loading has the same three columns.
 */
export function PublicHeaderAccountPanel() {
  const t = useTranslations('global.userToggle');
  const { account, isLoading, signOutEverywhere } = useAccount();

  if (isLoading) {
    return (
      <div className="mt-1 flex items-center gap-2 border-t border-border/60 pl-3 pt-1">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
        <div className="size-8 shrink-0" />
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="mt-1 flex items-center gap-2 border-t border-border/60 pl-3 pt-1">
      <UserAvatar account={account} className="size-6" />

      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {account.email}
      </p>

      {/* 32px box around a 16px icon; `touch-target` is the 44px floor. */}
      <button
        type="button"
        onClick={signOutEverywhere}
        aria-label={t('signOut')}
        className="relative flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors touch-target hover:bg-accent hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
