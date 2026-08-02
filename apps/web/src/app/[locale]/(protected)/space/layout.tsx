import { getUserProfile } from '@/entities/user-profile/api/get-user-profile';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const profileRes = await getUserProfile();
  const userName = profileRes.data?.displayName || 'Admin';

  return {
    title: `Space | Welcome, ${userName}`,
    description: 'Personal workspace to manage notes, schedule.',
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
}

export default async function SpaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-muted/40">
        <main className="container relative py-6 lg:py-8">
          <div className="mx-auto w-full min-w-0 p-4 lg:p-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
