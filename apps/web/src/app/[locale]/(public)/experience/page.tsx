import { supportedLanguages } from '@/config/language';
import { fetchData } from '@/lib/core/fetch';
import ExperienceTimeline, {
  CompanyExperience,
} from '@/components/experience-timeline';
import { ExperienceShell } from '@/components/shell';

export function generateStaticParams() {
  return supportedLanguages.map((lang) => ({ locale: lang }));
}

export default async function ExperiencesPage() {
  const experiences = await fetchData<CompanyExperience[]>('me/experience');

  return (
    <ExperienceShell>
      <ExperienceTimeline experienceData={experiences} />
    </ExperienceShell>
  );
}
