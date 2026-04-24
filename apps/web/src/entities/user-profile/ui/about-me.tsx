import { getTranslations } from 'next-intl/server';

import { getPublicAboutMe } from '@/entities/user-profile/api/get-public-about-me';
import { RichText } from '@/shared/ui';

export async function AboutMe() {
  const t = await getTranslations();
  const aboutMeResp = await getPublicAboutMe();
  if (!aboutMeResp.success) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
          {t('about.section.aboutMe')}
        </h2>
      </div>
      <div className="ml-0.5 pl-0">
        <RichText content={aboutMeResp?.data.aboutMe} />
      </div>
    </section>
  );
}
