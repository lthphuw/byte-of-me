import { Card, CardContent, CardHeader, CardTitle } from '@byte-of-me/ui';
import {
  BookOpen,
  Briefcase,
  Building2,
  Cpu,
  GraduationCap,
  MessageSquare,
  Tag,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getDashboardStats } from '@/features/dashboard/dashboard-stats/lib';

export async function StatsGrid() {
  const [dataResp, t, tDashboard] = await Promise.all([
    getDashboardStats(),
    getTranslations('dashboard.common'),
    getTranslations('dashboard.dashboard'),
  ]);
  // Not `null`: the section's heading still renders above, so returning
  // nothing left a labelled region with no content and no explanation.
  if (!dataResp.success || !dataResp.data) {
    return (
      <p className="text-sm text-destructive-text">{tDashboard('sectionError')}</p>
    );
  }
  const stats = dataResp.data;

  const primaryStats = [
    {
      label: t('stats.messagesLabel'),
      value: stats.totalMessages,
      sub: t('stats.messagesSub', { count: stats.newMessages }),
      icon: MessageSquare,
      color: 'text-blue-500',
    },
    {
      label: t('stats.projectsLabel'),
      value: stats.totalProjects,
      sub: t('stats.projectsSub'),
      icon: Briefcase,
      color: 'text-emerald-500',
    },
    {
      label: t('stats.blogsLabel'),
      value: stats.totalBlogs,
      sub: t('stats.blogsSub'),
      icon: BookOpen,
      color: 'text-orange-500',
    },
    {
      label: t('stats.educationLabel'),
      value: stats.totalEducation,
      sub: t('stats.educationSub'),
      icon: GraduationCap,
      color: 'text-purple-500',
    },
  ];

  const secondaryStats = [
    {
      label: t('stats.companiesLabel'),
      value: stats.totalCompanies,
      icon: Building2,
    },
    {
      label: t('stats.techStackLabel'),
      value: stats.totalTechStack,
      icon: Cpu,
    },
    { label: t('stats.tagsLabel'), value: stats.totalTags, icon: Tag },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primaryStats.map((s) => (
          <Card
            key={s.label}
            className="border-none bg-card/60 shadow-sm backdrop-blur-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">
                {s.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {secondaryStats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-4"
          >
            <div className="rounded-lg bg-background p-2 shadow-sm">
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold leading-none">{s.value}</div>
              <p className="mt-1 text-[10px] font-semibold uppercase text-muted-foreground">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
