export const CACHE_TAGS = {
  BLOG: 'blog',
  COMPANY: 'company',
  CONTACT: 'contact-message',
  EDUCATION: 'education',
  MEDIA: 'media',
  PROJECT: 'project',
  SOCIAL: 'social-link',
  TAG: 'tag',
  TECH: 'tech-stack',
  USER: 'user-profile',
  COMMENT: 'comment',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export enum INTERACTION {
  LIKE= 'LIKE',
  CLAP= 'CLAP',
}

/**
 * Carries the requested pathname from `proxy.ts` to the server components that
 * need it.
 *
 * A React Server Component layout receives `params`, never the URL — so
 * `(protected)/layout.tsx`, the one place that knows a visitor is unauthenticated,
 * cannot on its own tell whether they were reaching for `/notes` or `/dashboard`.
 * That is why every rejected visitor used to land on the dashboard regardless of
 * where they were going. The proxy is the last layer that still holds the URL, so
 * it forwards it here.
 *
 * Setting this reads no session and keeps the proxy free of the NextAuth config,
 * which the comment in `proxy.ts` explains must stay out of the edge bundle.
 */
export const PATHNAME_HEADER = 'x-pathname';
