'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAccount } from '@/widgets/public/public-site-header/lib/use-account';
import { UserAvatar } from '@/widgets/public/public-site-header/ui/user-avatar';

/**
 * The account, as one row at the foot of the mobile nav panel.
 *
 * It moved here because three 44px targets and a wordmark did not fit in a
 * phone header — the two islands measured 396px of a 500px viewport. Theme and
 * language stayed; only the account left.
 *
 * The email rather than the name: `useAccount` falls back to the role when
 * there is no name, and "Admin" identifies nobody. Sign out is an icon on the
 * right — it is the only action here, so it needs a position, not a label.
 */
export function PublicHeaderAccountPanel() {
  const t = useTranslations('global.userToggle');
  const { account, signOutEverywhere } = useAccount();

  if (!account) return null;

  return (
    <div className="mt-1 flex items-center gap-2 border-t border-border/60 pl-3 pt-1">
      <UserAvatar account={account} className="size-7" />

      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {account.email}
      </p>

      {/* 44px, like every other target in this panel — the icon is 16px but
          the box §14 asks for is not. */}
      <button
        type="button"
        onClick={() => void signOutEverywhere()}
        aria-label={t('signOut')}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
