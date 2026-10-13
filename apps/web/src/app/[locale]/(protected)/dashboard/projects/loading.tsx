import { ManagerPageLoading } from '@/shared/ui/manager-page-loading';

/** Route fallback for the Projects manager: the same skeleton as its client loading state. */
export default function ProjectsLoading() {
  return <ManagerPageLoading variant="grid" />;
}
