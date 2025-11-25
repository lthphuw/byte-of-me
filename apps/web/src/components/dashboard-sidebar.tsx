'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { Briefcase, Code2, FileText, GraduationCap, Image, LayoutDashboard, LogOut, Tags, UserCircle } from 'lucide-react';
import { User } from 'next-auth';
import { signOut } from 'next-auth/react';



import { UserAvatar } from '@/components/user-avatar';





const navItems = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/dashboard/profile', label: 'Thông tin cá nhân', icon: UserCircle },
  { href: '/dashboard/banner', label: 'Banner Images', icon: Image },
  { href: '/dashboard/education', label: 'Học vấn', icon: GraduationCap },
  { href: '/dashboard/experience', label: 'Kinh nghiệm', icon: Briefcase },
  { href: '/dashboard/projects', label: 'Dự án', icon: Code2 },
  { href: '/dashboard/tech-stack', label: 'Tech Stack', icon: Tags },
  { href: '/dashboard/blogs', label: 'Blogs', icon: FileText },
];

interface DashboardSidebarProps {
  user: User;
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold tracking-tight">Byte of me</h2>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} className="h-12 w-12" />
            <div>
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-sm text-muted-foreground">Quản trị viên</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t p-4">
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(event) => {
                event.preventDefault()
                signOut({
                  callbackUrl: `${window.location.origin}/auth/login`,
                })}}
            >
              <LogOut className="h-5 w-5" />
              Đăng xuất
            </button>
        </div>
      </div>
    </aside>
  );
}
