import {
  Greeting,
  ProfileQuote,
  getPublicUserProfile,
} from '@/entities/user-profile';
import { ProfileSectionMotion } from '@/features/public/homepage-profile/ui/profile-section-motion';
import { Link } from '@/i18n/navigation';
import { Routes } from '@/shared/config/global';
import { Button } from '@/shared/ui/button';
import { Route } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { HomepageProfileEmpty } from './homepage-profile-empty';

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
      <ProfileSectionMotion>
        <section
          id="hero"
          className="max-w-3xl mx-auto space-y-5 md:space-y-8 text-left"
        >
          <Greeting text={profile.greeting || ''} />
          <p className="text-base md:text-xl text-muted-foreground">
            {profile.tagLine}
          </p>
        </section>
      </ProfileSectionMotion>

      {/* ABOUT / MY STORY */}
      <ProfileSectionMotion delay={0.1}>
        <section
          id="about"
          className={`grid gap-10 md:gap-14 items-start ${
            hasQuote ? 'md:grid-cols-2' : 'max-w-3xl mx-auto grid-cols-1'
          }`}
        >
          <div className="space-y-6 md:space-y-8">
            <div className="space-y-4 md:space-y-5">
              <h2 className="text-xs md:text-sm uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                {t('myStory')}
              </h2>

              <div className="text-sm md:text-base leading-relaxed text-muted-foreground">
                {profile.bio}
              </div>
            </div>

            <div className="space-y-4">
              <Link href={Routes.About}>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm md:text-base group"
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
      </ProfileSectionMotion>
    </section>
  );
}
