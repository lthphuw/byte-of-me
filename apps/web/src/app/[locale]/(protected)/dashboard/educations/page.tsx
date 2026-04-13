import { getAllAdminEducations } from '@/entities/education/api/get-all-admin-educations';
import { EducationManager } from '@/widgets/dashboard/education-manager/ui/education-manager';

export default async function EducationPage() {
  const resp = await getAllAdminEducations();

  return (
    <div className="space-y-6">
      <EducationManager initialData={resp.success ? resp.data : []} />
    </div>
  );
}
