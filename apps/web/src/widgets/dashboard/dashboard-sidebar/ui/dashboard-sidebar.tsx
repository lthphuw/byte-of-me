'use client';

import { logOut } from '@/features/auth/lib';
import { Link } from '@/i18n/navigation';
import { useToast } from '@/shared/hooks/use-toast';
import { purgeEntireCache } from '@/shared/lib/revalidate';

import {
  Briefcase,
  Code2,
  DatabaseZap,
  ExternalLink,
  FileText,
  GraduationCap,
  Image,
  Languages,
  LogOut,
  Tag,
  Tags,
  UserCircle,
  Wallpaper,
} from 'lucide-react';

import { DashboardNavItems } from './dashboard-nav-items';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Wallpaper,
  },
  {
    href: '/dashboard/user-profile',
    label: 'Personal information',
    icon: UserCircle,
  },
  { href: '/dashboard/media', label: 'Media', icon: Image },
  {
    href: '/dashboard/educations',
    label: 'Education',
    icon: GraduationCap,
  },
  { href: '/dashboard/companies', label: 'Companies', icon: Briefcase },
  { href: '/dashboard/projects', label: 'Projects', icon: Code2 },
  { href: '/dashboard/tech-stacks', label: 'Tech stack', icon: Tags },
  { href: '/dashboard/blogs', label: 'Blogs', icon: FileText },
  { href: '/dashboard/tags', label: 'Tags', icon: Tag },
  { href: '/dashboard/translations', label: 'Translations', icon: Languages },
];

export function DashboardSidebar() {
  const toast = useToast();

  return (
    <aside className="bg-background sticky top-0 z-40 h-screen w-[255px] shrink-0 border-r">
      <div className="flex h-full flex-col">
        <div className="border-b px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">Byte of me</h1>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <DashboardNavItems items={navItems} />
        </nav>

        <div className="space-y-1 border-t p-3">
          <form
            action={() => {
              purgeEntireCache()
                .then(() => {
                  toast.toast({
                    title: 'Cache cleared',
                    description: 'All caches have been cleared successfully.',
                  });
                })
                .catch((error) => {
                  toast.toast({
                    title: 'Error clearing cache',
                    description:
                      'An error occurred while clearing caches. Please try again.',
                  });
                });
            }}
          >
            <button
              type="submit"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
            >
              <DatabaseZap className="size-4" />
              Clear all caches
            </button>
          </form>

          <Link
            target="_blank"
            href="/apps/web/public"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View public site
          </Link>

          <form action={logOut}>
            <button
              type="submit"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
