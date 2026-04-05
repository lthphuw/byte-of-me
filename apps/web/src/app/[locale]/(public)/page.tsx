import { getUserProfileWithRecentProjects } from '@/lib/actions/public/get-user-profile-with-recent-projects';
import { HomepageContent } from '@/components/homepage-content';
import { HomeShell } from '@/components/shell';

export default async function HomePage() {
  const res = await getUserProfileWithRecentProjects();
  if (!res.success) {
    return (
      <HomeShell>
        <div className="p-4">Failed to load homepage content.</div>
      </HomeShell>
    );
  }

  return (
    <HomeShell>
      <HomepageContent {...res.data} />
    </HomeShell>
  );
}
