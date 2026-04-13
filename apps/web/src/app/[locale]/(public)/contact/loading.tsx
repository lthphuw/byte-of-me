import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';
import { ContactShell } from '@/widgets/public/contact-content/ui/contact-shell';

export default function ContactLoading() {
  return (
    <ContactShell>
      <Skeleton className={cn('size-full')} />
    </ContactShell>
  );
}
