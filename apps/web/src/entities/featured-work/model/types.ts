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
