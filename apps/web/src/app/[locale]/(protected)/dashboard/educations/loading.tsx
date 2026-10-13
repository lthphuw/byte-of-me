import { ManagerPageLoading } from '@/shared/ui/manager-page-loading';

/** Route fallback for the Educations manager: the same skeleton as its client loading state. */
export default function EducationsLoading() {
  return <ManagerPageLoading variant="list" />;
}
