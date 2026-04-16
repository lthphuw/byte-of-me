import React from 'react';
import { getTranslations } from 'next-intl/server';

import { ContactForm } from '@/features/public/contact-me/ui/form';

export async function ContactMe() {
  const t = await getTranslations('contact');
  return (
    <div className="pt-6">
      <div className="mb-4 text-center text-xs text-muted-foreground">
        {t('or')}
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <p className="text-center text-sm font-medium">
          {t('sendMeADirectMessage')}
        </p>

        <ContactForm />
      </div>
    </div>
  );
}
