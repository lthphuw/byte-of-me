import { ManagerPageLoading } from '@/shared/ui';

/** The profile is a form, so its loading state is the form's skeleton, not a list's. */
export default function UserProfileLoading() {
  return <ManagerPageLoading variant="form" />;
}
