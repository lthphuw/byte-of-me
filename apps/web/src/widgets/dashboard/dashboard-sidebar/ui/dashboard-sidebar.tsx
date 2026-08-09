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
import { DatabaseZap, ExternalLink, Globe, LogOut, Menu } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { DashboardNavItems } from './dashboard-nav-items';

import { logOutDashboard } from '@/features/auth/lib';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { purgeEntireCache } from '@/shared/lib/revalidate';
import { BrandMark } from '@/shared/ui/brand-mark';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('dashboard.sidebar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

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

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'vi' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 py-7">
        <div className="flex size-7 items-center justify-center rounded-md">
          <BrandMark layer="cms" />
        </div>
        <h1 className="text-base font-bold tracking-tight">Byte of Me</h1>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <h2 className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </h2>
            <DashboardNavItems items={group.items} onItemClick={onNavigate} />
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-border/40 p-4">
        {/* Language Switcher Button */}
        <button
          onClick={toggleLanguage}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <Globe className="size-4" />
          <span className="flex-1 text-left">
            {locale === 'en' ? 'Tiếng Việt' : 'English'}
          </span>
          <span className="text-[10px] font-bold uppercase opacity-50">
            {locale}
          </span>
        </button>

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
      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-40 hidden h-screen w-[260px] shrink-0 border-r border-border/50 bg-card lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border/50 bg-background/80 px-2 py-2 backdrop-blur lg:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 p-0"
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md">
            <BrandMark layer="cms" />
          </div>
          <span className="text-base font-bold tracking-tight">
            Byte of Me
          </span>
        </div>
      </div>
    </>
  );
}
