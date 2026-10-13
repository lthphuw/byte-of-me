import { ManagerPageLoading } from '@/shared/ui/manager-page-loading';

/** Route fallback for the Tech Stack manager: the same skeleton as its client loading state. */
export default function TechStacksLoading() {
  return <ManagerPageLoading variant="grid" />;
}
