import ExperienceTimeline, {
  CompanyExperience,
} from '@/components/experience-timeline';
import { ExperienceShell } from '@/components/shell';
import { supportedLanguages } from '@/config/language';
import { fetchData } from '@/lib/fetch';


export function generateStaticParams() {
  return supportedLanguages.map(lang => ({ locale: lang }))
}

export default async function ExperiencesPage() {
  const experiences = await fetchData<CompanyExperience[]>('me/experiences');

  return (
    <ExperienceShell>
      <ExperienceTimeline experienceData={experiences} />
    </ExperienceShell>
  );
}
