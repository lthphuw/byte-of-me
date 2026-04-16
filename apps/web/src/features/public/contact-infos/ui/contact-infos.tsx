import React from 'react';
import { getTranslations } from 'next-intl/server';

import { getAllPublicContacts } from '@/entities/social-link/api/get-all-public-contacts';
import {
  ContactHeaderMotion,
  ContactItemMotion,
  ContactListMotion,
} from '@/features/public/contact-infos/ui/contact-motions';
import { env } from '@/shared/config/env';
import { Link } from '@/shared/i18n/navigation';
import { Icons } from '@/shared/ui/icons';

export async function ContactInfos() {
  const t = await getTranslations('contact');
  const contactsResp = await getAllPublicContacts();
  if (!contactsResp.success) {
    return null;
  }

  const email =
    contactsResp.data.socialLinks.find((it) => it.platform === 'email')?.url ||
    env.EMAIL;
  const linkedIn = contactsResp.data.socialLinks.find(
    (it) => it.platform === 'linkedIn'
  )?.url;
  const github = contactsResp.data.socialLinks.find(
    (it) => it.platform === 'github'
  )?.url;

  const contacts = [
    email && {
      href: `mailto:${email}`,
      label: 'Email',
      description: email,
      icon: Icons.email,
    },
    linkedIn && {
      href: linkedIn,
      label: 'LinkedIn',
      description: t('linkedIn'),
      icon: Icons.linkedin,
    },
    github && {
      href: github,
      label: 'GitHub',
      description: t('gitHub'),
      icon: Icons.github,
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number }>;
  }[];

  if (contacts.length === 0) return null;

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Header */}
      <ContactHeaderMotion id="contact-info">
        <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
          {t('letsWorkTogether')}
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {t('feelFreeToReachOutThroughAnyChannel')}
        </p>
      </ContactHeaderMotion>

      {/* Contact items */}
      <ContactListMotion>
        {contacts.map((item) => {
          const Icon = item.icon;
          return (
            <ContactItemMotion key={item.href}>
              <Link
                href={item.href}
                target="_blank"
                className="group flex items-center gap-4 rounded-lg border border-border px-4 py-3 transition hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:text-foreground">
                  <Icon size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </div>
                <span className="ml-auto text-xs text-muted-foreground opacity-60 transition">
                  ↗
                </span>
              </Link>
            </ContactItemMotion>
          );
        })}
      </ContactListMotion>
    </div>
  );
}
