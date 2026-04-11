import { Link } from '@/i18n/navigation';
import { Routes } from '@/shared/config/global';
import { Button } from '@/shared/ui/button';
import { UserCircle2 } from 'lucide-react';

export function HomepageProfileEmpty() {
  return (
    <section className="flex flex-col items-center justify-center py-20 text-center space-y-6">
      <div className="bg-muted rounded-full p-6">
        <UserCircle2 className="w-12 h-12 text-muted-foreground/50" />
      </div>

      <div className="max-w-sm space-y-2">
        <h3 className="text-xl font-semibold">Profile Not Set Up</h3>
        <p className="text-muted-foreground text-sm">
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
