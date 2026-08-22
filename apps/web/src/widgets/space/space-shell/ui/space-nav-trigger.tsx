'use client';

import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { logOutDashboard } from '@/features/auth/lib';
import { BrandMark } from '@/shared/ui/brand-mark';
import {
  NavDrawer,
  NavDrawerAction,
  NavDrawerLink,
} from '@/shared/ui/nav-drawer';
import { useSpaceNavItems } from '@/widgets/space/space-shell/model/use-space-nav-items';
import { useSettingsDialog } from '@/widgets/space/space-shell/ui/space-settings-provider';

/**
 * The mobile half of the space navigation: a hamburger that opens the same
 * destinations the rail shows, in the same drawer the dashboard opens.
 *
 * Rendered by the *page* inside its own header rather than by `SpaceShell`,
 * deliberately. A shell-owned top bar would stack on top of every page's own
 * header, and on a phone the notes editor cannot spare 48px twice — that
 * doubled chrome is a large part of why the writing area felt cramped. Pages
 * that have no header of their own can still mount this on its own row.
 *
 * The three destinations are one group with no visible heading, which is what
 * a single-group `NavDrawer` renders: no hairline, no caption, just the list.
 */
export function SpaceNavTrigger({ className }: { className?: string }) {
  const t = useTranslations('dashboard.space');
  const items = useSpaceNavItems();
  const { open: openSettings } = useSettingsDialog();

  return (
    <NavDrawer
      className={className}
      triggerLabel={t('openNav')}
      title={t('title')}
      brand={<BrandMark layer="space" />}
      groups={[{ label: t('navAriaLabel'), items }]}
      footer={(close) => (
        <>
          {/* The rail's settings button had no counterpart here, so on a phone
              the dialog could only be reached by keyboard shortcut — which is
              to say not at all. */}
          <NavDrawerAction
            onClick={() => {
              close();
              openSettings();
            }}
          >
            <Settings className="size-4" />
            <span>{t('settings.open')}</span>
          </NavDrawerAction>

          <NavDrawerLink href="/dashboard" onClick={close}>
            <LayoutDashboard className="size-4" />
            <span>{t('actions.dashboard')}</span>
          </NavDrawerLink>

          <form action={logOutDashboard}>
            <NavDrawerAction type="submit">
              <LogOut className="size-4" />
              <span>{t('actions.signOut')}</span>
            </NavDrawerAction>
          </form>
        </>
      )}
    />
  );
}
