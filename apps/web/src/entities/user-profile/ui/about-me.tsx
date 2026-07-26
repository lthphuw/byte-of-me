import { RichText } from '@byte-of-me/ui/rich-text';
import { getTranslations } from 'next-intl/server';

import { getPublicAboutMe } from '@/entities/user-profile/api/get-public-about-me';

export async function AboutMe() {
  const t = await getTranslations();
  const aboutMeResp = await getPublicAboutMe();
  if (!aboutMeResp.success) {
    return null;
  }

  return (
    <section>
      {/* sr-only h1 keeps the outline/SEO; visually the prose IS the intro.
          No space-y here: it would offset the prose below the other pages'
          first line, since the hidden h1 still counts as a sibling. */}
      <h1 className="sr-only">{t('about.section.aboutMe')}</h1>
      <RichText content={aboutMeResp?.data.aboutMe} />
    </section>
  );
}
