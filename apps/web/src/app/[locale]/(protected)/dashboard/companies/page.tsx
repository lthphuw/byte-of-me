import type { Metadata } from 'next';

import { CompanyManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Experience',
  description: 'Manage your professional work history and company records.',
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

export default async function CompaniesPage() {
  return (
    <div className="space-y-6">
      <CompanyManager />
    </div>
  );
}
