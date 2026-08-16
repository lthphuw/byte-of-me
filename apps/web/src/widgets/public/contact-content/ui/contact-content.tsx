import React, { Suspense } from 'react';

import { ContactShell } from './contact-shell';

import {
  ContactInfos,
  ContactInfosLoading,
  ContactMe,
} from '@/features/public';
import { RevealSection } from '@/shared/ui';

export async function ContactContent() {
  return (
    <ContactShell>
      <div className="mx-auto w-full max-w-md space-y-16 md:space-y-24">
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
