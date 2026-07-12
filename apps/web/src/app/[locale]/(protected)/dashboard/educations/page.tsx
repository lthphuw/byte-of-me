import type { Metadata } from 'next';

import { EducationManager } from '@/widgets/dashboard';





export const metadata: Metadata = {
  title: 'Education',
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
      <EducationManager />
    </div>
  );
}
