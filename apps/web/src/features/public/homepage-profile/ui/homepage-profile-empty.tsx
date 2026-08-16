import { Button } from '@byte-of-me/ui';
import { UserCircle2 } from 'lucide-react';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';

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

      {/* `asChild`, not <Link><Button>: the nested form renders <a><button>,
          which is invalid and costs two tab stops. */}
      <Button variant="outline" asChild>
        <Link href={Routes.Homepage}>Return Home</Link>
      </Button>
    </section>
  );
}
