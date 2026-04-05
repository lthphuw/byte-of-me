import { getCompanies } from '@/lib/actions/public/get-companies';
import { ExperienceContent } from '@/components/experience-content';
import { ExperienceShell } from '@/components/shell';

export default async function ExperiencesPage() {
  const companiesResp = await getCompanies();

  if (!companiesResp.success) {
    return (
      <ExperienceShell>
        <div className="p-4">Failed to load experience data.</div>
      </ExperienceShell>
    );
  }

  return (
    <ExperienceShell>
      <ExperienceContent companies={companiesResp.data}/>
    </ExperienceShell>
  );
}
