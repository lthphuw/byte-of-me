import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { TechStackManager } from '@/widgets/dashboard/tech-stack-manager/ui/tech-stack-manager';

export const metadata = { title: 'Tech Stack' };

export default async function TechStackPage() {
  const resp = await getAllAdminTechStack();

  if (!resp.success) {
    return null;
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tech Stack</h1>
        <p className="text-muted-foreground">Manage your stack</p>
      </div>

      <TechStackManager initialTechStacks={resp.data} />
    </div>
  );
}
