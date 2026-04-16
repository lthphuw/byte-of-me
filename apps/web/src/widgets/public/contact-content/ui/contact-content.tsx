import React, { Suspense } from 'react';

import { ContactSectionMotion } from './contact-section-motion';
import { ContactShell } from './contact-shell';

import {
  ContactInfos,
  ContactInfosLoading,
  ContactMe,
} from '@/features/public';

export async function ContactContent() {
  return (
    <ContactShell>
      <div className="mx-auto w-full max-w-md space-y-8">
        <ContactSectionMotion id="contact-info">
          <Suspense fallback={<ContactInfosLoading />}>
            <ContactInfos />
          </Suspense>
        </ContactSectionMotion>

        <ContactSectionMotion id="contact-send-message">
          <ContactMe />
        </ContactSectionMotion>
      </div>
    </ContactShell>
  );
}
