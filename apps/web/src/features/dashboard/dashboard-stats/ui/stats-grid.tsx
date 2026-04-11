import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
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
            className="border-none shadow-sm bg-card/60 backdrop-blur-md"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase">
                {s.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {secondaryStats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-dashed"
          >
            <div className="p-2 rounded-lg bg-background shadow-sm">
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold leading-none">{s.value}</div>
              <p className="text-[10px] text-muted-foreground uppercase mt-1 font-semibold">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
