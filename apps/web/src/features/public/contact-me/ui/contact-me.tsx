import React from 'react';
import { getTranslations } from 'next-intl/server';

import { ContactForm } from '@/features/public/contact-me/ui/form';

export async function ContactMe() {
  const t = await getTranslations('contact');

  return (
    <section
      aria-labelledby="contact-form-title"
      className="space-y-4 rounded-lg border border-border p-4 md:space-y-6 md:p-6"
    >
      <h2 id="contact-form-title" className="text-lg font-semibold md:text-xl">
        {t('sendMeADirectMessage')}
      </h2>

      <ContactForm />
    </section>
  );
}
