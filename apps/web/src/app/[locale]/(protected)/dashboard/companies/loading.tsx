import { ManagerPageLoading } from '@/shared/ui/manager-page-loading';

/** Route fallback for the Companies manager: the same skeleton as its client loading state. */
export default function CompaniesLoading() {
  return <ManagerPageLoading variant="list" />;
}
