import { ManagerPageLoading } from '@/shared/ui/manager-page-loading';

/** Route fallback for the tag manager: the header, then the tag grid it renders. */
export default function TagsLoading() {
  return <ManagerPageLoading variant="grid" />;
}
