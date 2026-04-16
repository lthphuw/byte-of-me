import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Experience | Dashboard',
  description: 'Manage your professional work history and company records.',
  robots: { index: false },
};

export default async function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Work Experience</h1>
        <p className="text-muted-foreground text-lg">
          Maintain your professional timeline and details of companies you have
          worked with.
        </p>
      </div>
    </div>
  );
}
