import { MediaManager } from '@/widgets/media-manager/ui/media-manager';

export const metadata = { title: 'Banner Images' };

export default async function MediaPage() {
  return (
    <div className="space-y-6">
      <MediaManager />
    </div>
  );
}
