import { fetchData } from '@/lib/core/fetch';
import ExperienceContent, {
  CompanyExperience,
} from '@/components/experience-content';
import { ExperienceShell } from '@/components/shell';

export default async function ExperiencesPage() {
  const experiences = await fetchData<CompanyExperience[]>('me/experience');

  return (
    <ExperienceShell>
      <ExperienceContent experienceData={experiences} />
    </ExperienceShell>
  );
}
