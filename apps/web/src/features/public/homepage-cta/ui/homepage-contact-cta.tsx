import { getTranslations } from 'next-intl/server';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';

export async function HomepageContactCta() {
  const t = await getTranslations('homepage');

  return (
    <section
      id="contact-cta"
      className="space-y-4 rounded-2xl border bg-card/50 p-6 text-center md:space-y-6 md:p-10 lg:p-14"
    >
      <h2 className="text-xl font-semibold md:text-3xl">
        {t('haveAnIdeaInMind')}
      </h2>
      <p className="mx-auto max-w-xl text-sm text-muted-foreground md:text-base">
        {t('alwaysInterestedInThoughtfulProjectsAndGoodCollaboration')}
      </p>
      <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
        <Link href={`${Routes.Contact}#contact-send-message`}>
          <Button size="lg" className="w-full px-8 sm:w-auto">
            {t('emailMe')}
          </Button>
        </Link>
        <Link href={`${Routes.Contact}#contact-info`}>
          <Button size="lg" variant="outline" className="w-full px-8 sm:w-auto">
            {t('contactDetails')}
          </Button>
        </Link>
      </div>
    </section>
  );
}
