'use client';

import { Link, usePathname } from '@/i18n/navigation';
import {
  Briefcase,
  Code2,
  ExternalLink,
  FileText,
  GraduationCap,
  Image,
  Languages,
  LayoutDashboard,
  LogOut,
  Tags,
  UserCircle,
} from 'lucide-react';
import { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useLocale } from 'next-intl';

import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  {
    href: '/dashboard/profile',
    label: 'Personal information',
    icon: UserCircle,
  },
  { href: '/dashboard/banner', label: 'Banner images', icon: Image },
  { href: '/dashboard/education', label: 'Education', icon: GraduationCap },
  { href: '/dashboard/experience', label: 'Experience', icon: Briefcase },
  { href: '/dashboard/projects', label: 'Projects', icon: Code2 },
  { href: '/dashboard/tech-stack', label: 'Tech stack', icon: Tags },
  { href: '/dashboard/blogs', label: 'Blogs', icon: FileText },
  { href: '/dashboard/translations', label: 'Translations', icon: Languages },
];

interface DashboardSidebarProps {
  user: User;
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <aside className="sticky top-0 z-40 h-screen w-[255px] shrink-0 border-r bg-background">
      <div className="flex h-full flex-col">
        {/* ================= BRAND ================= */}
        <div className="border-b px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">
            Byte of me
          </h1>
        </div>

        {/* ================= NAV ================= */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ================= FOOTER ================= */}
        <div className="space-y-1 border-t p-3">
          {/* View public site */}
          <Link
            target={'_blank'}
            href="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            View public site
          </Link>

          {/* Logout */}
          <button
            type="button"
            onClick={() =>
              signOut({
                callbackUrl: `${window.location.origin}/${locale}/auth/login`,
              })
            }
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
