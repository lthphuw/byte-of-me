import type { Metadata } from 'next';

import { EducationManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Education | Dashboard',
  description:
    'Manage your academic history, certifications, and achievements.',
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

export default async function EducationPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Education</h1>
        <p className="text-lg text-muted-foreground">
          Curate your academic background and professional certifications.
        </p>
      </div>

      <EducationManager />
    </div>
  );
}
