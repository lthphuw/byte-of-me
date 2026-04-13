import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { TechStackManager } from '@/widgets/dashboard/tech-stack-manager/ui/tech-stack-manager';

export const metadata = { title: 'Tech Stack' };

export default async function TechStackPage() {
  const resp = await getAllAdminTechStack();

  if (!resp.success) {
    return null;
  }
  return (
      <TechStackManager initialTechStacks={resp.data} />
  );
}
