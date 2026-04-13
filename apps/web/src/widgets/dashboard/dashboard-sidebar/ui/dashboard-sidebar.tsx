'use client';

import { logOut } from '@/features/auth/lib';
import { Link } from '@/i18n/navigation';
import { useToast } from '@/shared/hooks/use-toast';
import { purgeEntireCache } from '@/shared/lib/revalidate';
import { Icons } from '@/shared/ui/icons';

import { Briefcase, Code2, DatabaseZap, ExternalLink, FileText, GraduationCap, Image as ImageIcon, Languages, LayoutDashboard, LogOut, Tag, Tags, UserCircle } from 'lucide-react';

import { DashboardNavItems } from './dashboard-nav-items';


// Grouping items to create a better hierarchy
const menuGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/user-profile', label: 'Profile', icon: UserCircle },
    ],
  },
  {
    label: 'Portfolio Content',
    items: [
      { href: '/dashboard/projects', label: 'Projects', icon: Code2 },
      { href: '/dashboard/blogs', label: 'Blogs', icon: FileText },
      { href: '/dashboard/media', label: 'Media Library', icon: ImageIcon },
    ],
  },
  {
    label: 'Resume Data',
    items: [
      { href: '/dashboard/companies', label: 'Companies', icon: Briefcase },
      {
        href: '/dashboard/educations',
        label: 'Education',
        icon: GraduationCap,
      },
      { href: '/dashboard/tech-stacks', label: 'Tech Stacks', icon: Tags },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/dashboard/tags', label: 'Tags', icon: Tag },
      {
        href: '/dashboard/translations',
        label: 'Translations',
        icon: Languages,
      },
    ],
  },
];

export function DashboardSidebar() {
  const { toast } = useToast();

  const handleClearCache = async () => {
    try {
      await purgeEntireCache();
      toast({
        title: 'System updated',
        description: 'All caches have been cleared successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'An error occurred while clearing caches.',
      });
    }
  };

  return (
    <aside className="bg-card border-border/50 sticky top-0 z-40 h-screen w-[260px] shrink-0 border-r">
      <div className="flex h-full flex-col">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-7">
          <div className="flex size-7 items-center justify-center rounded-md">
            <Icons.logo />
          </div>
          <h1 className="text-base font-bold tracking-tight">Byte of Me</h1>
        </div>

        {/* Navigation Area */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
          {menuGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h2 className="text-muted-foreground/60 px-2 text-[10px] font-bold uppercase tracking-wider">
                {group.label}
              </h2>
              <DashboardNavItems items={group.items} />
            </div>
          ))}
        </nav>

        {/* Utility & Actions Footer */}
        <div className="border-border/40 mt-auto space-y-1 border-t p-4">
          <button
            onClick={handleClearCache}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all"
          >
            <DatabaseZap className="size-4" />
            <span>Clear Cache</span>
          </button>

          <Link
            target="_blank"
            href="/apps/web/public"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all"
          >
            <ExternalLink className="size-4" />
            <span>View Site</span>
          </Link>

          <form action={logOut} className="pt-2">
            <button
              type="submit"
              className="hover:bg-muted/80 text-muted-foreground/80 hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
