import { getAboutInfo } from '@/lib/actions/public/get-about-info';
import { AboutContent } from '@/components/about-content';
import { AboutShell } from '@/components/shell';

export default async function AboutPage() {
  const res = await getAboutInfo();
  if (!res.success) {
    return;
  }
  const { userProfile, techStacks = [], educations = [] } = res.data;

  return (
    <AboutShell>
      <AboutContent
        userProfile={userProfile}
        techStacks={techStacks}
        educations={educations}
      />
    </AboutShell>
  );
}
