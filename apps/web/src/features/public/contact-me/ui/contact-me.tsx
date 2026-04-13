import React from 'react';
import { ContactForm } from '@/features/public/contact-me/ui/form';

import { getTranslations } from 'next-intl/server';

export async function ContactMe() {
  const t = await getTranslations('contact');
  return (
    <div className="pt-6">
      <div className="text-muted-foreground mb-4 text-center text-xs">
        {t('or')}
      </div>

      <div className="border-border space-y-4 rounded-lg border p-4">
        <p className="text-center text-sm font-medium">
          {t('sendMeADirectMessage')}
        </p>

        <ContactForm />
      </div>
    </div>
  );
}
