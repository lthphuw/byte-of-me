import React from 'react';
import { ContactForm } from '@/features/public/contact-me/ui/form';
import { getTranslations } from 'next-intl/server';

export async function ContactMe() {
  const t = await getTranslations('contact');
  return (
    <div className="pt-6">
      <div className="text-center text-xs text-muted-foreground mb-4">
        {t('or')}
      </div>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <p className="text-sm font-medium text-center">
          {t('sendMeADirectMessage')}
        </p>

        <ContactForm />
      </div>
    </div>
  );
}
