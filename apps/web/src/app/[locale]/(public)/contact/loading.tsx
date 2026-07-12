import { Skeleton } from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';
import { ContactShell } from '@/widgets/public/contact-content/ui/contact-shell';

export default function ContactLoading() {
  return (
    <ContactShell>
      <Skeleton className={cn('size-full')} />
    </ContactShell>
  );
}
