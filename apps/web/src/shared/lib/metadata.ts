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

/** The three access layers the site is split into, each with its own favicon. */
export type IconLayer = 'public' | 'cms' | 'space';

/**
 * Builds the complete icon set for an access layer.
 *
 * A nested layout's `icons` REPLACES the parent's outright — same wholesale
 * semantics as `openGraph` above. Measured on Next 16.2.3: adding
 * `icons: { icon: '…' }` to a nested layout dropped the root's `shortcut` and
 * `apple-touch-icon` links entirely. So a layer cannot declare just the part it
 * wants to change; it has to restate everything. This helper is the only place
 * that knows what "everything" is.
 *
 * SVG is listed first because it is the only format that can invert itself on a
 * dark tab strip (each file carries its own prefers-color-scheme rule). The
 * PNGs are the fallback for browsers that skip it, and they cannot adapt —
 * those browsers get the dark-ink mark on every theme.
 *
 * `apple` is deliberately shared across layers: the manifest scope is the whole
 * locale, so there is one installed app and one home-screen icon. Only the tab
 * favicon varies.
 *
 * Related constraint: never add `app/favicon.ico` or `app/icon.*`. Next injects
 * file-convention icons automatically and they would defeat these overrides.
 */
export function buildIconSet(layer: IconLayer): Metadata['icons'] {
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
