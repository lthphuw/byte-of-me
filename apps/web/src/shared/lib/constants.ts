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
