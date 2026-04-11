import { Link } from '@/i18n/navigation';
import { Routes } from '@/shared/config/global';
import { Button } from '@/shared/ui/button';
import { getTranslations } from 'next-intl/server';

export async function HomepageContactCta() {
  const t = await getTranslations('homepage');

  return (
    <section
      id="contact-cta"
      className="rounded-2xl border bg-card/50 p-6 md:p-10 lg:p-14 text-center space-y-4 md:space-y-6"
    >
      <h2 className="text-xl md:text-3xl font-semibold">
        {t('haveAnIdeaInMind')}
      </h2>
      <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
        {t('alwaysInterestedInThoughtfulProjectsAndGoodCollaboration')}
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
        <Link href={`${Routes.Contact}#contact-send-message`}>
          <Button size="lg" className="w-full sm:w-auto px-8">
            {t('emailMe')}
          </Button>
        </Link>
        <Link href={`${Routes.Contact}#contact-info`}>
          <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
            {t('contactDetails')}
          </Button>
        </Link>
      </div>
    </section>
  );
}
