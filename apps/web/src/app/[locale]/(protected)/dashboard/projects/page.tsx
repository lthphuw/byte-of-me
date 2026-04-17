import type { Metadata } from 'next';

import { ProjectManager } from '@/widgets/dashboard';





export const metadata: Metadata = {
  title: 'Projects',
  description: 'Showcase your work and manage project details.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-lg text-muted-foreground">
          Manage your portfolio gallery, case studies, and deployment links.
        </p>
      </div>

      <ProjectManager />
    </div>
  );
}
