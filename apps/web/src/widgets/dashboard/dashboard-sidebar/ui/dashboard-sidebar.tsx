'use client';

import { useState } from 'react';
import {
  Button,
  Icons,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@byte-of-me/ui';
import { DatabaseZap, ExternalLink, LogOut, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { DashboardNavItems } from './dashboard-nav-items';

import { logOutDashboard } from '@/features/auth/lib';
import { Link } from '@/shared/i18n/navigation';
import { BrandMark } from '@/shared/ui/brand-mark';
import { ColorSchemeModeToggle } from '@/shared/ui/color-scheme-toggle';
import { I18nToggle } from '@/shared/ui/language-toggle';
import type { MenuPlacement } from '@/shared/ui/menu-placement';
import { purgeEntireCache } from '@/widgets/dashboard/dashboard-sidebar/lib/purge-entire-cache';

/**
 * `menuPlacement` is threaded in rather than decided here because this exact
 * markup renders twice, in two places with different room around them: a
 * 260px column pinned to the left of a wide window, and a 288px drawer over a
 * phone. The toggles' menus have to open in different directions in the two,
 * and the component cannot tell which one it is inside.
 */
function SidebarContent({
  onNavigate,
  menuPlacement,
}: {
  onNavigate?: () => void;
  menuPlacement: MenuPlacement;
}) {
  const t = useTranslations('dashboard.sidebar');

  const menuGroups = [
    {
      label: t('groups.overview'),
      items: [
        {
          href: '/dashboard',
          label: t('items.dashboard'),
          icon: Icons.dashboard,
        },
        {
          href: '/dashboard/user-profile',
          label: t('items.profile'),
          icon: Icons.userCircle,
        },
      ],
    },
    {
      label: t('groups.portfolio'),
      items: [
        {
          href: '/dashboard/projects',
          label: t('items.projects'),
          icon: Icons.projects,
        },
        {
          href: '/dashboard/blogs',
          label: t('items.blogs'),
          icon: Icons.blogs,
        },
        {
          href: '/dashboard/comments',
          label: t('items.comments'),
          icon: Icons.comments,
        },
        {
          href: '/dashboard/media',
          label: t('items.media'),
          icon: Icons.media,
        },
      ],
    },
    {
      label: t('groups.resume'),
      items: [
        {
          href: '/dashboard/companies',
          label: t('items.companies'),
          icon: Icons.companies,
        },
        {
          href: '/dashboard/educations',
          label: t('items.education'),
          icon: Icons.education,
        },
        {
          href: '/dashboard/tech-stacks',
          label: t('items.techStacks'),
          icon: Icons.techStacks,
        },
      ],
    },
    {
      label: t('groups.configuration'),
      items: [
        { href: '/dashboard/tags', label: t('items.tags'), icon: Icons.tags },
      ],
    },
  ];

  const handleClearCache = async () => {
    try {
      await purgeEntireCache();
      toast(t('actions.cacheSuccess'), {
        description: t('actions.cacheSuccessDesc'),
      });
    } catch (error) {
      toast.error(t('actions.cacheError'), {
        description: t('actions.cacheErrorDesc'),
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* `span`, not the `h1` this used to be. Every dashboard page has its own
          `h1` — "Welcome back, …" on this one — so the sidebar's was a second
          top-level heading on every screen, and a reader jumping by headings
          landed on the product name before the page. The space drawer has
          always used a span here; this is the same markup. */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex size-7 items-center justify-center rounded-md">
          <BrandMark layer="cms" />
        </div>
        <span className="text-base font-bold tracking-tight">Byte of Me</span>
      </div>

      {/* The four group names are still here, still read out, and no longer
          drawn: a hairline says "these belong together" as well as a caption
          does, and four uppercase captions in a 200px column were most of what
          made this sidebar look busy next to the notes workspace. Deleting the
          headings outright would have been the easy version and the wrong one
          — it would flatten ten destinations into one undifferentiated list
          for anyone navigating by heading. */}
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
        {menuGroups.map((group) => (
          <div
            key={group.label}
            className="space-y-1 border-t border-border/40 pt-3 first:border-t-0 first:pt-0"
          >
            <h2 className="sr-only">{group.label}</h2>
            <DashboardNavItems items={group.items} onItemClick={onNavigate} />
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-border/40 p-3">
        {/* Theme and language, the two shared toggles the public header and
            the space rail also use.

            This replaced a hand-rolled Globe button that swapped between
            exactly two locales — correct today and quietly wrong the moment a
            third is added, since "the other language" stops being a single
            answer. The theme control is new here: until the toggles moved into
            `shared/ui` the dashboard had no way to leave dark mode at all. */}
        <div className="flex items-center gap-1 pb-1">
          <ColorSchemeModeToggle {...menuPlacement} />
          <I18nToggle {...menuPlacement} />
        </div>

        <button
          onClick={handleClearCache}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <DatabaseZap className="size-4" />
          <span>{t('actions.clearCache')}</span>
        </button>

        <Link
          target="_blank"
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          <span>{t('actions.viewSite')}</span>
        </Link>

        <form action={logOutDashboard} className="pt-2">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/80 transition-all hover:bg-muted/80 hover:text-foreground"
          >
            <LogOut className="size-4" />
            <span>{t('actions.signOut')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar.
          200px rather than 260px. Ten labelled destinations still fit — the
          longest, "Media Library", uses about two thirds of the text column —
          and the 60px goes to the content, which is the part of a CMS anyone
          is actually looking at. */}
      <aside className="sticky top-0 z-40 hidden h-screen w-[200px] shrink-0 border-r border-border/50 bg-card lg:block">
        {/* Sideways, because the controls sit at the foot of a full-height
            column: dropping downwards from there opens into the bottom edge of
            the window. `align="end"` puts the menu's own bottom edge on the
            button's, so it grows up the sidebar rather than off the screen. */}
        <SidebarContent menuPlacement={{ side: 'right', align: 'end' }} />
      </aside>

      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border/50 bg-background/80 px-2 py-2 backdrop-blur lg:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          {/* `w-64`, the width the space drawer already uses — the two are the
              same drawer on the same phone and had no reason to differ. */}
          <SheetContent
            side="left"
            className="w-64 p-0"
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {/* Upwards in the drawer — see the note on the desktop copy.
                Right would put the menu in the sliver of screen beside a
                288px sheet. */}
            <SidebarContent
              onNavigate={() => setMobileNavOpen(false)}
              menuPlacement={{ side: 'top', align: 'start' }}
            />
          </SheetContent>
        </Sheet>

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
