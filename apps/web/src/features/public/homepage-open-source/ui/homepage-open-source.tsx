import { Button } from '@byte-of-me/ui';
import { getTranslations } from 'next-intl/server';

import { getOpenSourceContributions } from '@/entities/open-source/api/get-open-source-contributions';
import { RepoLinkRow } from '@/entities/open-source/ui/repo-link-row';
import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';

const TOP_REPOS = 3;

export async function HomepageOpenSource() {
  const t = await getTranslations('homepage');
  const tOss = await getTranslations('components.openSource');
  const resp = await getOpenSourceContributions();

  const repos = resp.success ? resp.data.repos : [];
  // No empty state: a section that says "nothing here" is worse than no
  // section. A missing token or a GitHub outage both land here.
  if (repos.length === 0) return null;

  const totalPrs = repos.reduce((sum, repo) => sum + repo.prCount, 0);

  return (
    <section id="open-source" className="space-y-8 md:space-y-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between md:gap-10">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold md:text-3xl">
            {t('openSourceTitle')}
          </h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            {tOss('summary', { prs: totalPrs, repos: repos.length })}
          </p>
        </div>

        {/* `asChild`, not <Link><Button>: the nested form renders <a><button>,
            which is invalid and costs two tab stops. */}
        <Button
          variant="link"
          className="h-auto self-start p-0 text-sm md:text-base"
          asChild
        >
          <Link href={`${Routes.Projects}?view=open-source`}>
            {t('viewAllContributions')}
          </Link>
        </Button>
      </div>

      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {repos.slice(0, TOP_REPOS).map((repo) => (
          <li key={repo.nameWithOwner}>
            <RepoLinkRow
              repo={repo}
              labels={{ prCount: (count) => tOss('prCount', { count }) }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
