import type { MetadataRoute } from 'next';

export const sitemapConfig: Record<
  string,
  {
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  }
> = {
  '/': { priority: 1.0, changeFrequency: 'daily' },
  // '/cv': { priority: 0.9, changeFrequency: 'monthly' },
  '/blogs': { priority: 0.85, changeFrequency: 'weekly' },
  '/projects': { priority: 0.85, changeFrequency: 'weekly' },
  // '/experience' is deliberately absent: the page redirects to the homepage
  // (see (public)/experience/page.tsx). Advertising it here made the sitemap
  // promise a URL that answers 200 with a `meta refresh`, which Search Console
  // reports as "Page with redirect" and never indexes. Restore this line at the
  // same time as the page body.
  '/about': { priority: 0.7, changeFrequency: 'monthly' },
  '/contact': { priority: 0.7, changeFrequency: 'monthly' },
};
