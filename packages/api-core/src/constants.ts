export const CACHE_TAGS = {
  BLOG: 'blog',
  COMPANY: 'company',
  CONTACT: 'contact-message',
  EDUCATION: 'education',
  FEATURED_WORK: 'featured-work',
  MEDIA: 'media',
  PROJECT: 'project',
  SOCIAL: 'social-link',
  TAG: 'tag',
  TECH: 'tech-stack',
  USER: 'user-profile',
  COMMENT: 'comment',
  /** Merged pull requests read from GitHub; refreshed by time, not by a write. */
  OPEN_SOURCE: 'open-source',
  /**
   * The author's dashboard preferences (image compression). Not folded into
   * `USER`: a popover toggle writes it often, and sharing a tag would drop the
   * cached public about-me and footer reads on every change.
   */
  WORKSPACE_SETTINGS: 'workspace-settings',
} as const;

export enum INTERACTION {
  LIKE = 'LIKE',
  CLAP = 'CLAP',
}
