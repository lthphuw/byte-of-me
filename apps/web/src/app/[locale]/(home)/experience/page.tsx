import { fetchData } from '@/lib/fetch';
import ExperienceTimeline, {
  CompanyExperience,
} from '@/components/experience-timeline';
import { ExperienceShell } from '@/components/shell';

export default async function ExperiencesPage() {
  const experiences = await fetchData<CompanyExperience[]>('me/experiences');

  return (
    <ExperienceShell>
      <ExperienceTimeline experienceData={experiences} />
    </ExperienceShell>
  );
}
