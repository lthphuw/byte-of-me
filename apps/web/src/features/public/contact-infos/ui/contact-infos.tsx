import React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Icons,
} from '@byte-of-me/ui';
import { getTranslations } from 'next-intl/server';

import { getAllPublicContacts } from '@/entities/social-link/api/get-all-public-contacts';
import {
  ContactItemMotion,
  ContactListMotion,
} from '@/features/public/contact-infos/ui/contact-motions';
import { env } from '@/shared/config/env';
import { Link } from '@/shared/i18n/navigation';

/**
 * The line under a channel's name exists to identify the account, the way the
 * email row shows the address itself. Repeating the platform name there — what
 * the LinkedIn and GitHub rows used to do — carries no information, so derive a
 * readable profile address from the stored URL instead: host without `www.`,
 * plus the path. Never a hardcoded handle (§11.7); the URL comes from the
 * social-link records.
 *
 * Returns undefined when the URL is not parseable or resolves to nothing
 * readable, and the row then renders with its label alone rather than a blank
 * second line.
 */
function toProfileAddress(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  const host = parsed.host.replace(/^www\./, '');
  const path = parsed.pathname.replace(/\/+$/, '');
  return `${host}${path}` || undefined;
}

function ChannelsNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icons.contact className="size-10 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle className="text-muted-foreground">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export async function ContactInfos() {
  const t = await getTranslations('contact.channels');
  const contactsResp = await getAllPublicContacts();

  // The heading is rendered by the page, not here, so a failed read no longer
  // takes the page's only `h1` down with it — but the column still has to say
  // something rather than vanish (§11.9).
  if (!contactsResp.success) {
    return (
      <ChannelsSection title={t('title')}>
        <ChannelsNotice
          title={t('errorTitle')}
          description={t('errorDescription')}
        />
      </ChannelsSection>
    );
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
      description: toProfileAddress(linkedIn),
      icon: Icons.linkedin,
    },
    github && {
      href: github,
      label: 'GitHub',
      description: toProfileAddress(github),
      icon: Icons.github,
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    description?: string;
    icon: React.ComponentType<{ size?: number }>;
  }[];

  if (contacts.length === 0) {
    return (
      <ChannelsSection title={t('title')}>
        <ChannelsNotice
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      </ChannelsSection>
    );
  }

  return (
    <ChannelsSection title={t('title')}>
      <ContactListMotion>
        {contacts.map((item) => {
          const Icon = item.icon;
          // `mailto:` hands off to a mail client; `target="_blank"` there only
          // left an empty tab behind.
          const isExternal = !item.href.startsWith('mailto:');

          return (
            <ContactItemMotion key={item.href}>
              <Link
                href={item.href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="group flex items-center gap-4 rounded-lg border border-border px-4 py-3 transition hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:text-foreground group-focus-visible:-translate-y-0.5 group-focus-visible:text-foreground">
                  <Icon size={18} />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">
                    {item.label}
                    {isExternal ? (
                      <span className="sr-only"> {t('opensInNewTab')}</span>
                    ) : null}
                  </span>
                  {item.description ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </div>
                {isExternal ? (
                  <Icons.externalLink
                    aria-hidden
                    className="ml-auto size-4 shrink-0 text-muted-foreground opacity-60 transition group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                ) : null}
              </Link>
            </ContactItemMotion>
          );
        })}
      </ContactListMotion>
    </ChannelsSection>
  );
}

function ChannelsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="contact-channels-title"
      className="space-y-4 md:space-y-6"
    >
      <h2
        id="contact-channels-title"
        className="text-lg font-semibold md:text-xl"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
