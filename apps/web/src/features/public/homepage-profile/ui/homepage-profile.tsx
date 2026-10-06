import { getTranslations } from 'next-intl/server';

import { HomepageProfileEmpty } from './homepage-profile-empty';

import {
  getPublicUserProfile,
  Greeting,
  ProfileQuote,
} from '@/entities/user-profile';

export async function HomepageProfile() {
  const t = await getTranslations('homepage');
  const userProfile = await getPublicUserProfile();

  if (!userProfile.success || !userProfile.data) {
    return <HomepageProfileEmpty />;
  }

  const profile = userProfile.data;
  const hasQuote = !!profile.quote;

  return (
    <section id="profile" className="space-y-6 md:space-y-8">
      {/* HERO SECTION */}
      <section
        id="hero"
        className="mx-auto max-w-3xl space-y-4 text-left md:space-y-6"
      >
        <Greeting text={profile.greeting || ''} />
        <p className="text-base text-muted-foreground md:text-xl">
          {profile.tagLine}
        </p>
      </section>

      {/* ABOUT / MY STORY */}
      <section
        id="about"
        className={`grid items-start gap-4 md:gap-8 ${
          hasQuote ? 'md:grid-cols-2' : 'mx-auto max-w-3xl grid-cols-1'
        }`}
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:text-sm">
              {t('myStory')}
            </h2>

            <div className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {profile.bio}
            </div>
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
