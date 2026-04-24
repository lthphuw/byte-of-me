import { UserCircle2 } from 'lucide-react';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui';

export function HomepageProfileEmpty() {
  return (
    <section className="flex flex-col items-center justify-center space-y-6 py-20 text-center">
      <div className="rounded-full bg-muted p-6">
        <UserCircle2 className="h-12 w-12 text-muted-foreground/50" />
      </div>

      <div className="max-w-sm space-y-2">
        <h3 className="text-xl font-semibold">Profile Not Set Up</h3>
        <p className="text-sm text-muted-foreground">
          The public profile you are looking for is currently unavailable or
          hasn't been configured yet.
        </p>
      </div>

      <Link href={Routes.Homepage}>
        <Button variant="outline">Return Home</Button>
      </Link>
    </section>
  );
}
