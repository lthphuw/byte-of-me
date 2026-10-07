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
      <RevealSection immediate>
        <ListPageHeader
          title={t('letsWorkTogether')}
          description={t('feelFreeToReachOutThroughAnyChannel')}
        />
      </RevealSection>

      {/* Channels first in source order, so they come first when the columns
          stack below md. The whole page is the first screen on a desktop, so
          both columns are `immediate`: hidden in the server HTML they would
          hold back the LCP candidate until JS ran. */}
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-10">
        <RevealSection id="contact-info" immediate>
          <Suspense fallback={<ContactInfosLoading />}>
            <ContactInfos />
          </Suspense>
        </RevealSection>

        <RevealSection id="contact-send-message" immediate>
          <ContactMe />
        </RevealSection>
      </div>
    </ContactShell>
  );
}
