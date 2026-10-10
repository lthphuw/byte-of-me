import { describe, expect, it } from 'bun:test';

import {
  buildAlternates,
  buildPublicPageMetadata,
  buildSiteJsonLd,
  SITE_PERSON_ID,
} from './metadata';

import { siteConfig } from '@/shared/config/site';
import { routing } from '@/shared/i18n/routing';

describe('buildSiteJsonLd', () => {
  const payload = JSON.stringify(
    buildSiteJsonLd({ locale: 'en', description: 'd' }),
  );

  it('does not publish an email address, since every page carries this graph', () => {
    expect(payload).not.toContain('"email"');
  });

  it('gives the Person node the id that blog posts reference as their author', () => {
    expect(payload).toContain(`"@type":"Person","@id":"${SITE_PERSON_ID}"`);
  });
});

describe('buildAlternates', () => {
  it('lists every locale and points x-default at the default locale', () => {
    const { languages } = buildAlternates(
      `${siteConfig.url}/vi/blogs/x`,
      '/blogs/x',
    );

    for (const locale of routing.locales) {
      expect(languages).toHaveProperty(
        locale,
        `${siteConfig.url}/${locale}/blogs/x`,
      );
    }
    expect(languages).toHaveProperty(
      'x-default',
      `${siteConfig.url}/${routing.defaultLocale}/blogs/x`,
    );
  });

  it('advertises the RSS feed', () => {
    expect(buildAlternates(siteConfig.url, '').types).toEqual({
      'application/rss+xml': `${siteConfig.url}/feed.xml`,
    });
  });
});

describe('buildPublicPageMetadata', () => {
  it('gives a top-level page the alternates the shared builder produces', () => {
    const { alternates } = buildPublicPageMetadata({
      segment: 'projects',
      locale: 'en',
      title: 'Projects',
      description: 'd',
    });

    expect(alternates).toEqual(
      buildAlternates(`${siteConfig.url}/en/projects`, '/projects'),
    );
  });
});
