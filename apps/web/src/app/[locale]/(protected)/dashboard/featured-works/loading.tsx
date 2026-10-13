import { ManagerPageLoading } from '@/shared/ui/manager-page-loading';

/** Route fallback for the Featured works manager: the same skeleton as its client loading state. */
export default function FeaturedWorksLoading() {
  return <ManagerPageLoading variant="list" />;
}
