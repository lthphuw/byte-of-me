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
      <ProjectManager />
    </div>
  );
}
