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
  // '/experience' is deliberately absent: next.config.js permanently redirects it
  // to the homepage, and a sitemap must not list a redirect. Restore this line
  // with the page body, once the redirect rule is gone.
  '/contact': { priority: 0.7, changeFrequency: 'monthly' },
};
