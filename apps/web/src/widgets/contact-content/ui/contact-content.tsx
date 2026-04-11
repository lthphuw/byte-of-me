import React, { Suspense } from 'react';
import { ContactInfos } from '@/features/public/contact-infos/ui/contact-infos';
import { ContactInfosLoading } from '@/features/public/contact-infos/ui/contact-infos-loading';
import { ContactMe } from '@/features/public/contact-me/ui/contact-me';
import { ContactSectionMotion } from '@/widgets/contact-content/ui/contact-section-motion';
import { ContactShell } from '@/widgets/contact-content/ui/contact-shell';

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
          <div className="pt-6">
            <ContactMe />
          </div>
        </ContactSectionMotion>
      </div>
    </ContactShell>
  );
}
