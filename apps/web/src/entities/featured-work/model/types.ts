import type { Prisma } from '@byte-of-me/db/types';

export interface GithubPullRequestRef { owner: string; repo: string; number: number }
export interface FeaturedWorkGithub { repo: string; stars: number; merged: boolean }

/** One row of the admin list and the editor's `initialData`: the whole entry is small. */
export type AdminFeaturedWork = Prisma.FeaturedWorkGetPayload<{
  include: {
    translations: {
      select: { id: true; language: true; title: true; description: true };
    };
  };
}>;

/**
 * The full row the editor dialog edits. `details` is a stringified TipTap document
 * (at most 32,768 characters), so it stays out of the list: the dialog loads this by id.
 */
export type AdminFeaturedWorkDetail = Prisma.FeaturedWorkGetPayload<{
  include: {
    translations: {
      select: {
        id: true;
        language: true;
        title: true;
        description: true;
        details: true;
      };
    };
  };
}>;

/** What the homepage renders: translated, with `host` and the GitHub facts resolved. */
export interface PublicFeaturedWork {
  id: string;
  title: string;
  description: string | null;
  /** Sanitized HTML of this language's details body, or null. Never the stored JSON. */
  detailsHtml: string | null;
  url: string | null;
  /** Hostname of `url` without a leading `www.`; null when there is no url. */
  host: string | null;
  github: FeaturedWorkGithub | null;
}
