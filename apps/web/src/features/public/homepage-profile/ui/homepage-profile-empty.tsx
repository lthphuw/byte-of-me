import { Button } from '@byte-of-me/ui';
import { UserCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';

export async function HomepageProfileEmpty() {
  const t = await getTranslations('homepage');

  return (
    <section className="flex flex-col items-center justify-center space-y-4 py-20 text-center md:space-y-6">
      <div className="rounded-full bg-muted p-6">
        <UserCircle2 className="h-12 w-12 text-muted-foreground/50" />
      </div>

      <div className="max-w-sm space-y-2">
        <h3 className="text-xl font-semibold">
          {t('profileUnavailableTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('profileUnavailableDescription')}
        </p>
      </div>

      {/* `asChild`, not <Link><Button>: the nested form renders <a><button>,
          which is invalid and costs two tab stops. */}
      <Button variant="outline" asChild>
        <Link href={Routes.Homepage}>{t('returnHome')}</Link>
      </Button>
    </section>
  );
}
