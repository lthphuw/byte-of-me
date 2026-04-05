import { getEducations } from '@/lib/actions/dashboard/education/get-educations';
import { EducationManager } from '@/components/education-manager';

export default async function EducationPage() {
  const resp = await getEducations();

  return (
    <div className="space-y-6">
      <EducationManager initialData={resp.success ? resp.data : []} />
    </div>
  );
}
