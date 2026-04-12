import {
  BookOpen,
  Briefcase,
  Building2,
  Cpu,
  GraduationCap,
  Languages,
  MessageSquare,
  Tag,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

export function StatsGrid({ stats }: { stats: any }) {
  const primaryStats = [
    {
      label: 'Messages',
      value: stats.totalMessages,
      sub: `${stats.newMessages} new`,
      icon: MessageSquare,
      color: 'text-blue-500',
    },
    {
      label: 'Projects',
      value: stats.totalProjects,
      sub: 'Live works',
      icon: Briefcase,
      color: 'text-emerald-500',
    },
    {
      label: 'PublicBlog Posts',
      value: stats.totalBlogs,
      sub: 'Articles',
      icon: BookOpen,
      color: 'text-orange-500',
    },
    {
      label: 'PublicEducation',
      value: stats.totalEducation,
      sub: 'Certificates',
      icon: GraduationCap,
      color: 'text-purple-500',
    },
  ];

  const secondaryStats = [
    { label: 'Companies', value: stats.totalCompanies, icon: Building2 },
    { label: 'Tech Stack', value: stats.totalTechStack, icon: Cpu },
    { label: 'Tags', value: stats.totalTags, icon: Tag },
    { label: 'Translations', value: stats.totalTranslations, icon: Languages },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primaryStats.map((s) => (
          <Card
            key={s.label}
            className="bg-card/60 border-none shadow-sm backdrop-blur-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                {s.label}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-muted-foreground mt-1 text-[10px] font-medium uppercase">
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
            className="bg-muted/30 flex items-center gap-3 rounded-xl border border-dashed p-4"
          >
            <div className="bg-background rounded-lg p-2 shadow-sm">
              <s.icon className="text-muted-foreground h-4 w-4" />
            </div>
            <div>
              <div className="text-lg font-bold leading-none">{s.value}</div>
              <p className="text-muted-foreground mt-1 text-[10px] font-semibold uppercase">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
