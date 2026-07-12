import type { Metadata } from 'next';

import { getAllAdminTechStack } from '@/entities';
import { TechStackManager } from '@/widgets/dashboard';





export const metadata: Metadata = {
  title: 'Tech Stack',
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
      <TechStackManager initialTechStacks={resp.data} />
    </div>
  );
}
