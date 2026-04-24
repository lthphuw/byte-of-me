import { Route } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { HomepageProfileEmpty } from './homepage-profile-empty';

import {
  getPublicUserProfile,
  Greeting,
  ProfileQuote,
} from '@/entities/user-profile';
import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui';

export async function HomepageProfile() {
  const t = await getTranslations('homepage');
  const userProfile = await getPublicUserProfile();

  if (!userProfile.success || !userProfile.data) {
    return <HomepageProfileEmpty />;
  }

  const profile = userProfile.data;
  const hasQuote = !!profile.quote;

  return (
    <section id="profile" className="space-y-8 md:space-y-12">
      {/* HERO SECTION */}
      <section
        id="hero"
        className="mx-auto max-w-3xl space-y-5 text-left md:space-y-8"
      >
        <Greeting text={profile.greeting || ''} />
        <p className="text-base text-muted-foreground md:text-xl">
          {profile.tagLine}
        </p>
      </section>

      {/* ABOUT / MY STORY */}
      <section
        id="about"
        className={`grid items-start gap-10 md:gap-14 ${
          hasQuote ? 'md:grid-cols-2' : 'mx-auto max-w-3xl grid-cols-1'
        }`}
      >
        <div className="space-y-6 md:space-y-8">
          <div className="space-y-4 md:space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:text-sm">
              {t('myStory')}
            </h2>

            <div className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {profile.bio}
            </div>
          </div>

          <div className="space-y-4">
            <Link href={Routes.About}>
              <Button
                variant="link"
                className="group h-auto p-0 text-sm md:text-base"
              >
                {t('moreAboutMyJourney')} <Route className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {hasQuote && (
          <div className="flex justify-center md:justify-end">
            <ProfileQuote
              quote={profile.quote || ''}
              author={profile.quoteAuthor || ''}
            />
          </div>
        )}
      </section>
    </section>
  );
}
