import type { Metadata } from 'next';

import { host } from '@/shared/config/host';
import { siteConfig } from '@/shared/config/site';
import type { JsonLdObject } from '@/shared/ui/json-ld';

/**
 * Site-level structured data, rendered once in the locale layout so every page
 * carries it.
 *
 * Only the blog post route described itself to search engines; the other twelve
 * URLs shipped no JSON-LD at all, so nothing tied the site and its author
 * together as entities. The two nodes are linked by `@id` rather than nested,
 * which lets the `BlogPosting` on a post reference the same Person without
 * repeating it.
 */
export function buildSiteJsonLd({
  locale,
  description,
}: {
  locale: string;
  description: string;
}): JsonLdObject {
  const personId = `${siteConfig.url}/#person`;

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
        publisher: { '@id': personId },
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: 'lthphuw',
        url: siteConfig.url,
        email: siteConfig.email,
        sameAs: [siteConfig.links.github],
      },
    ],
  };
}

interface PublicPageMetadataInput {
  /** Route segment below the locale, e.g. `about`. */
  segment: string;
  locale: string;
  title: string;
  description: string;
  /** Page-specific keywords; the site-wide list is appended automatically. */
  keywords?: string[];
}

/**
 * Builds the metadata for a top-level public page.
 *
 * The five public layouts each hand-rolled this same object, and all five left
 * `images` out of `openGraph`. Next.js replaces `openGraph` wholesale rather
 * than merging it with the root layout's, so those pages shipped with no social
 * preview image at all — only the homepage and blog posts had one. Centralising
 * it means a new page cannot repeat the mistake.
 */
export function buildPublicPageMetadata({
  segment,
  locale,
  title,
  description,
  keywords = [],
}: PublicPageMetadataInput): Metadata {
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
    keywords: [...keywords, ...siteConfig.keywords].map((key) =>
      key.toLowerCase()
    ),
    alternates: {
      canonical: url,
      languages: {
        vi: `${siteConfig.url}/vi/${segment}`,
        en: `${siteConfig.url}/en/${segment}`,
      },
    },
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
