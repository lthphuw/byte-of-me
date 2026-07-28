import { redirect } from 'next/navigation';

import { routing } from '@/shared/i18n/routing';

export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
