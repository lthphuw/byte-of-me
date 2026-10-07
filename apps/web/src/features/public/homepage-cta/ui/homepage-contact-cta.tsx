import { Button } from '@byte-of-me/ui';
import { getTranslations } from 'next-intl/server';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

// Button only transitions colours; the press scale needs `transform` listed too.
// Under reduced motion the scale and its transition drop out, the colour one stays.
const PRESS =
  'motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97] motion-safe:active:duration-120';

export async function HomepageContactCta() {
  const t = await getTranslations('homepage');

  return (
    <section
      id="contact-cta"
      className="space-y-4 rounded-2xl border bg-card/50 p-6 text-center md:space-y-6 md:p-8 lg:p-10"
    >
      <h2 className="text-xl font-semibold md:text-3xl">
        {t('haveAnIdeaInMind')}
      </h2>
      <p className="mx-auto max-w-xl text-sm text-muted-foreground md:text-base">
        {t('alwaysInterestedInThoughtfulProjectsAndGoodCollaboration')}
      </p>
      {/* `asChild`, not <Link><Button>: the nested form renders <a><button>,
          which is invalid and gives every CTA two tab stops. */}
      <div className="flex flex-col justify-center gap-2 pt-2 sm:flex-row">
        <Button
          size="lg"
          className={cn('w-full px-8 sm:w-auto', PRESS)}
          asChild
        >
          <Link href={`${Routes.Contact}#contact-send-message`}>
            {t('emailMe')}
          </Link>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className={cn('w-full px-8 sm:w-auto', PRESS)}
          asChild
        >
          <Link href={`${Routes.Contact}#contact-info`}>
            {t('contactDetails')}
          </Link>
        </Button>
      </div>
    </section>
  );
}
