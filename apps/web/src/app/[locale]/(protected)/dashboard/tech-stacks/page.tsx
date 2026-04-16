import type { Metadata } from 'next';

import { getAllAdminTechStack } from '@/entities';
import { TechStackManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Tech Stack | Dashboard',
  description: 'Manage your professional technologies and tools.',
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

export default async function TechStackPage() {
  const resp = await getAllAdminTechStack();

  if (!resp.success || !resp.data) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed">
        <h3 className="text-lg font-semibold">Failed to load tech stack</h3>
        <p className="text-sm text-muted-foreground">
          Please check your connection or try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Tech Stack</h1>
        <p className="text-lg text-muted-foreground">
          Maintain the list of technologies, frameworks, and tools you use.
        </p>
      </div>

      <TechStackManager initialTechStacks={resp.data} />
    </div>
  );
}
