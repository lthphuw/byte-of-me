import { Skeleton } from '@byte-of-me/ui';

import { ContactInfosLoading } from '@/features/public';
import { ContactShell } from '@/widgets/public/contact-content/ui/contact-shell';

/**
 * Mirrors `ContactContent`'s classes, not just its colours. The previous
 * `<Skeleton className="size-full" />` resolved `h-full` against `ShellBase`'s
 * content-derived height, collapsed to nothing, and made this route's loading
 * state a blank page.
 */
export default function ContactLoading() {
  return (
    <ContactShell>
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:gap-6 md:pb-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-72 max-w-full md:h-12" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-10">
        <ContactInfosLoading />

        <div className="space-y-4 rounded-lg border border-border p-4 md:space-y-6 md:p-6">
          <Skeleton className="h-7 w-48" />

          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full md:h-9" />
            </div>
          ))}

          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-36 w-full" />
          </div>

          <Skeleton className="h-11 w-full md:h-9" />
        </div>
      </div>
    </ContactShell>
  );
}
