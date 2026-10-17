import type { Metadata } from 'next';

import { host } from '@/shared/config/host';
import { siteConfig } from '@/shared/config/site';
import { routing } from '@/shared/i18n/routing';
import type { BrandLayer } from '@/shared/lib/brand-mark';

/** A JSON value, which is all schema.org payloads ever are. */
type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue | undefined };

export type JsonLdObject = { [key: string]: JsonLdValue | undefined };

/**
 * Site-level structured data, rendered once in the locale layout. The nodes link by `@id` instead of
 * nesting, so a post's `BlogPosting` can reference the same Person without repeating it.
 */
/** `@id` of the site's Person node. Blog posts point here as their author. */
export const SITE_PERSON_ID = `${siteConfig.url}/#person`;

export function buildSiteJsonLd({
  locale,
  description,
}: {
  locale: string;
  description: string;
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description,
        inLanguage: locale,
        publisher: { '@id': SITE_PERSON_ID },
      },
      {
        '@type': 'Person',
        '@id': SITE_PERSON_ID,
        name: 'lthphuw',
        url: siteConfig.url,
        // No email: this graph ships on every page and scrapers read it. Contact
        // goes through the visible mail link on the page.
        sameAs: [siteConfig.links.github],
      },
    ],
  };
}

/**
 * Icon set for a layer. A nested layout's `icons` REPLACES the parent's (Next 16.2.3 dropped `shortcut`
 * and `apple-touch-icon`), so each layer restates all. SVG is first: only it inverts on dark tabs.
 * `apple` is shared. Never add app/favicon.ico or app/icon.*: Next injects them over these overrides.
 */
export function buildIconSet(layer: BrandLayer): Metadata['icons'] {
  return {
    icon: [
      { url: `/icons/mark-${layer}.svg`, type: 'image/svg+xml' },
      { url: `/icons/mark-${layer}-32.png`, sizes: '32x32', type: 'image/png' },
      { url: `/icons/mark-${layer}-16.png`, sizes: '16x16', type: 'image/png' },
    ],
    shortcut: `/icons/mark-${layer}-32.png`,
    apple: '/apple-touch-icon.png',
  };
}

const FEED_URL = `${siteConfig.url}/feed.xml`;

/**
 * Canonical, hreflang (with `x-default`) and feed autodiscovery for one page.
 * `path` is the locale-less route, `''` for the homepage. Next replaces
 * `alternates` per layer, so each page must build it here or lose the feed link.
 */
export function buildAlternates(
  canonical: string,
  path: string
): NonNullable<Metadata['alternates']> {
  return {
    canonical,
    languages: {
      ...Object.fromEntries(
        routing.locales.map(
          (locale) => [locale, `${siteConfig.url}/${locale}${path}`] as const
        )
      ),
      'x-default': `${siteConfig.url}/${routing.defaultLocale}${path}`,
    },
    types: { 'application/rss+xml': FEED_URL },
  };
}

interface PublicPageMetadataInput {
  /** Route segment below the locale, e.g. `projects`. */
  segment: string;
  locale: string;
  title: string;
  description: string;
  /**
   * Page keywords, one comma-separated string from `metadata.<segment>.keywords` (site-wide ones are
   * appended). A string, not an array: array indices become keys, forcing en/vi to match in count.
   */
  keywords?: string;
}

/**
 * Metadata for a top-level public page. Next replaces `openGraph` wholesale, so images must be set
 * here or the page ships with no social preview. Keywords come from `metadata.<segment>.keywords`.
 */
export function buildPublicPageMetadata({
  segment,
  locale,
  title,
  description,
  keywords = '',
}: PublicPageMetadataInput): Metadata {
  const pageKeywords = keywords
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  const url = `${host}/${locale}/${segment}`;
  const fullTitle = `${title} | ${siteConfig.name}`;
  // Each page gets a card titled after itself rather than one generic image,
  // with its own translated description in the footer.
  const ogImage =
    `${siteConfig.ogImage}?title=${encodeURIComponent(title)}` +
    `&subtitle=${encodeURIComponent(description)}`;

  return {
    title,
    description,
    keywords: [...pageKeywords, ...siteConfig.keywords].map((key) =>
      key.toLowerCase()
    ),
    alternates: buildAlternates(url, `/${segment}`),
    openGraph: {
      title: fullTitle,
      description,
      url,
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      siteName: siteConfig.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      creator: '@lthphuw',
      images: [ogImage],
    },
  };
}
