import { Link } from '@/i18n/navigation';
import { User } from '@db/index';
import { getTranslations } from 'next-intl/server';

import { supportedLanguages } from '@/config/language';
import { fetchData } from '@/lib/core/fetch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GreetingWriter } from '@/components/greeting-writer';
import { Icons } from '@/components/icons';
import { ProfileBanner } from '@/components/profile-banner';
import { ProfileQuote } from '@/components/profile-quote';
import { HomeShell } from '@/components/shell';

export function generateStaticParams() {
  return supportedLanguages.map((lang) => ({ locale: lang }));
}

export default async function HomePage() {
  const t = await getTranslations('home');
  const user = await fetchData<User>('me');

  return (
    <HomeShell>
      <div className="flex flex-col items-stretch gap-8 relative justify-center px-4 md:px-8 py-12">
        {/* Heading */}
        <GreetingWriter text={user.greeting || ''} />

        {/* Tagline */}
        <h2 className="article-text mb-2 text-muted-foreground md:text-lg">
          {user?.tagLine || ''}
        </h2>

        <ProfileBanner
          images={((user as any)?.bannerImages).map((it: any) => ({
            ...it,
            alt: it.caption,
          }))}
        />
        <ProfileQuote quote={user?.quote || ''} />

        <div className="flex flex-col flex-wrap gap-4 md:flex-row">
          <Link href="/projects">
            <Button className="w-full py-3 gap-2 text-base md:w-auto md:py-2 md:text-base">
              <Icons.project />
              <span> {t('See my work')}</span>
            </Button>
          </Link>
          <Link href="/about">
            <Button
              variant="secondary"
              className={cn(
                'w-full gap-2 py-3 text-base md:w-auto md:py-2 md:text-base'
              )}
            >
              <Icons.file />
              <span>{t('README')}</span>
            </Button>
          </Link>
        </div>
      </div>
    </HomeShell>
  );
}
