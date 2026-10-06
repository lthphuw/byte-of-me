import { getLocale, getTranslations } from 'next-intl/server';

import type { OpenSourceRepo } from '@/entities/open-source/model/types';
import { RepoDetails } from '@/entities/open-source/ui/repo-details';

/**
 * The detailed Open source list on `/projects`: every repo, each expandable to
 * its merged pull requests. A server component handed in as a node, so the
 * client page that switches tabs ships none of this markup as JavaScript.
 */
export async function ProjectsOpenSource({
  repos,
}: {
  repos: OpenSourceRepo[];
}) {
  const tOss = await getTranslations('components.openSource');
  const locale = await getLocale();
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {repos.map((repo) => (
        <li key={repo.nameWithOwner}>
          <RepoDetails
            repo={repo}
            labels={{
              prCount: (count) => tOss('prCount', { count }),
              openRepo: tOss('openRepo'),
              formatDate: (iso) => dateFormat.format(new Date(iso)),
            }}
          />
        </li>
      ))}
    </ul>
  );
}
