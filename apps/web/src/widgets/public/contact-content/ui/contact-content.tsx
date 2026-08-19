import React, { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { ContactShell } from './contact-shell';

import {
  ContactInfos,
  ContactInfosLoading,
  ContactMe,
} from '@/features/public';
import { ListPageHeader, RevealSection } from '@/shared/ui';

export async function ContactContent() {
  const t = await getTranslations('contact');

  return (
    <ContactShell>
      {/* The `h1` lives here rather than inside `ContactInfos`: that component
          can legitimately render nothing but a notice, and the page's only
          heading must not depend on a query succeeding. */}
      <RevealSection>
        <ListPageHeader
          title={t('letsWorkTogether')}
          description={t('feelFreeToReachOutThroughAnyChannel')}
        />
      </RevealSection>

      {/* Channels first in source order, so they come first when the columns
          stack below md. */}
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-10">
        <RevealSection id="contact-info">
          <Suspense fallback={<ContactInfosLoading />}>
            <ContactInfos />
          </Suspense>
        </RevealSection>

        <RevealSection id="contact-send-message">
          <ContactMe />
        </RevealSection>
      </div>
    </ContactShell>
  );
}
