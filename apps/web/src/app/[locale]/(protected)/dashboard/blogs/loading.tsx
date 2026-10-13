import { ManagerPageLoading } from '@/shared/ui/manager-page-loading';

/** Route fallback for the blog manager: the header, then the post grid it renders. */
export default function BlogsLoading() {
  return <ManagerPageLoading variant="grid" />;
}
