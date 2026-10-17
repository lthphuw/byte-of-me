'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { DashboardNavActions } from './dashboard-nav-actions';
import { DashboardNavRail } from './dashboard-nav-rail';

import { BrandMark } from '@/shared/ui/brand-mark';
import { NavDrawer } from '@/shared/ui/nav-drawer';
import { persistSidebarExpanded } from '@/widgets/dashboard/dashboard-sidebar/lib/sidebar-state';
import { useDashboardNavGroups } from '@/widgets/dashboard/dashboard-sidebar/model/use-dashboard-nav-groups';

/**
 * The dashboard's navigation: the desktop sidebar from `lg`, and a hamburger
 * below it that opens the shared `NavDrawer`. Both read `useDashboardNavGroups`.
 */
export function DashboardSidebar({
  initialExpanded,
}: {
  initialExpanded: boolean;
}) {
  const t = useTranslations('dashboard.sidebar');
  const groups = useDashboardNavGroups();
  const [expanded, setExpanded] = useState(initialExpanded);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    persistSidebarExpanded(next);
  };

  return (
    <>
      <DashboardNavRail expanded={expanded} onToggle={toggleExpanded} />

      {/* Mobile topbar. `env(safe-area-inset-top)` on top of `py-1.5`: the bar is `sticky top-0`,
          so on a notched iPhone in standalone mode it sticks flush under the camera. */}
      <div
        className="sticky top-0 z-40 flex items-center gap-2 border-b border-border/50 bg-background px-2 pb-1.5 lg:hidden"
        style={{
          paddingTop: 'calc(0.375rem + env(safe-area-inset-top))',
        }}
      >
        <NavDrawer
          triggerLabel={t('openNav')}
          title="Byte of Me"
          brand={<BrandMark layer="cms" />}
          groups={groups}
          footer={(close) => <DashboardNavActions onNavigate={close} />}
        />

        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md">
            <BrandMark layer="cms" />
          </div>
          <span className="text-base font-bold tracking-tight">Byte of Me</span>
        </div>
      </div>
    </>
  );
}
