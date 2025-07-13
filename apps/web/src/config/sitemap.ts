import { MetadataRoute } from 'next';

export const sitemapConfig: Record<
  string,
  {
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  }
> = {
  '/': { priority: 1.0, changeFrequency: 'daily' },
  '/ask-me': { priority: 0.9, changeFrequency: 'daily' },
  // '/cv': { priority: 0.9, changeFrequency: 'monthly' },
  '/projects': { priority: 0.85, changeFrequency: 'weekly' },
  '/experience': { priority: 0.8, changeFrequency: 'monthly' },
  '/about': { priority: 0.7, changeFrequency: 'monthly' },
  '/contact': { priority: 0.7, changeFrequency: 'monthly' },
};
