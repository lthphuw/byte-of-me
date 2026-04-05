import { TagManager } from '@/components/tag-manager';

export const metadata = { title: 'Tags' };

export default async function TagsPage() {
  return (
    <div className="space-y-6">
      <TagManager />
    </div>
  );
}
