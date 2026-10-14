import type { Prisma } from '@byte-of-me/db/types';

export interface GithubPullRequestRef {
  owner: string;
  repo: string;
  number: number;
}
/** GitHub's own pull request state. The UI shows it as a text label, never as colour alone. */
export type FeaturedWorkPullRequestState = 'OPEN' | 'MERGED' | 'CLOSED';

/** What GitHub says about one pull request, as the homepage row shows it. */
export interface FeaturedWorkGithub {
  repo: string;
  stars: number;
  title: string;
  state: FeaturedWorkPullRequestState;
}

/** One row of the admin list. The editor loads `AdminFeaturedWorkDetail` by id instead. */
export type AdminFeaturedWork = Prisma.FeaturedWorkGetPayload<{
  include: {
    translations: {
      select: { id: true; language: true; title: true };
    };
    _count: { select: { links: true } };
  };
}>;

/** One slot of the demo pair as the editor shows it; `sortOrder` is 0 or 1. */
export interface AdminFeaturedWorkMedia {
  id: string;
  url: string;
  mimeType: string;
  label: string | null;
  sortOrder: number;
}

/** One proof link as the editor shows it; `sortOrder` is its position, 0 to 5. */
export interface AdminFeaturedWorkLink {
  id: string;
  url: string;
  label: string | null;
  sortOrder: number;
}

/**
 * The full row the editor dialog edits. `details` is a stringified TipTap document
 * (no length cap, as blog bodies have none), so it stays out of the list: the dialog loads this by id.
 * `media` is the demo pair, flattened and ordered by slot; `links` are the proof links in
 * position order. The list carries neither.
 */
export type AdminFeaturedWorkDetail = Prisma.FeaturedWorkGetPayload<{
  include: {
    translations: {
      select: {
        id: true;
        language: true;
        title: true;
        details: true;
      };
    };
  };
}> & { media: AdminFeaturedWorkMedia[]; links: AdminFeaturedWorkLink[] };

/** One demo item as the homepage renders it: a validated http(s) url. */
export interface PublicFeaturedWorkMedia {
  id: string;
  url: string;
  mimeType: string;
  /** Language-neutral tag such as "FP16"; null falls back to the work title in the UI. */
  label: string | null;
  /** Pixel size of the stored file; null when it was never read, so the box waits for the file. */
  width: number | null;
  height: number | null;
}

/** One proof link as the homepage renders it: a validated http(s) url and what it resolves to. */
export interface PublicFeaturedWorkLink {
  id: string;
  /** Already checked as http(s); the stored value is never trusted to be safe. */
  url: string;
  /** The authored tag ("INT8"); null means show the pull request's own title. */
  label: string | null;
  /** Hostname of `url` without a leading `www.`. */
  host: string;
  /** Repo and number, read from a pull request url; null for any other link. */
  pr: { repo: string; number: number } | null;
  /** GitHub's facts for this pull request; null when GitHub is off or did not answer. */
  github: FeaturedWorkGithub | null;
}

/** What the homepage renders: translated, with each link resolved. */
export interface PublicFeaturedWork {
  id: string;
  title: string;
  /** Sanitized HTML of this language's details body, or null. Never the stored JSON. */
  detailsHtml: string | null;
  /** The proof links in position order. Empty when the work has none. */
  links: PublicFeaturedWorkLink[];
  /** The side-by-side demo pair in slot order; empty when the work has none. */
  media: PublicFeaturedWorkMedia[];
}
