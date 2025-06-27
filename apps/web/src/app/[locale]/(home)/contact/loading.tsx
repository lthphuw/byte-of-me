import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactShell } from '@/components/shell';

export default function ContactLoading() {
  return (
    <ContactShell>
      <Skeleton className={cn('size-full')} />
    </ContactShell>
  );
}
