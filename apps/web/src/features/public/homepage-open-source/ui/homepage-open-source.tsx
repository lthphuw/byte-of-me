import { Button, ContentFade } from '@byte-of-me/ui';
import { getFormatter, getTranslations } from 'next-intl/server';

import { RepoRow, type RepoRowLabels } from './repo-row';

import { getOpenSourceContributions } from '@/entities/open-source/api/get-open-source-contributions';
import { openSourceHref } from '@/entities/open-source/model/open-source-url';
import { Link } from '@/shared/i18n/navigation';
import { SectionLoadError } from '@/shared/ui';
import { ViewSwitch, ViewSwitchRoot } from '@/shared/ui/view-switch';

const TOP_REPOS = 3;

export async function HomepageOpenSource() {
  const t = await getTranslations('homepage');
  const tOss = await getTranslations('components.openSource');
  const tError = await getTranslations('components.sectionLoadError');
  const format = await getFormatter();
  const resp = await getOpenSourceContributions();

  // The header's summary and link need the repos, so a failure keeps only the
  // heading and the error.
  if (!resp.success) {
    return (
      <ContentFade>
        <section id="open-source" className="space-y-6 md:space-y-8">
          <h2 className="text-xl font-semibold md:text-3xl">
            {t('openSourceTitle')}
          </h2>

          <SectionLoadError
            title={tError('title')}
            description={tError('description')}
          />
        </section>
      </ContentFade>
    );
  }

  const repos = resp.data.repos;
  // No empty state: a section that says "nothing here" is worse than no
  // section. A missing token lands here too, since its read succeeds empty.
  if (repos.length === 0) return null;

  const totalPrs = repos.reduce((sum, repo) => sum + repo.prCount, 0);
  const rowLabels: RepoRowLabels = {
    prCount: (count) => tOss('prCount', { count }),
    contributions: t('repoContributions'),
    repository: t('repoOnGithub'),
    opensInNewTab: t('featuredOpensInNewTab'),
    merged: tOss('merged'),
    view: tOss('view'),
    more: (count) => t('morePullRequests', { count }),
  };
  // UTC on purpose, like the `/projects` ledger: a PR merged just after midnight UTC must show
  // the same day to every reader.
  const formatDate = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium', timeZone: 'UTC' });

  return (
    <ContentFade>
      <ViewSwitchRoot id="open-source" className="space-y-6 md:space-y-8">
        {/* The right column is as tall as the title and summary beside it: link on top, switch
            below. On a phone it is one row under them. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between md:gap-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold md:text-3xl">
              {t('openSourceTitle')}
            </h2>
            <p className="text-xs text-muted-foreground md:text-sm">
              {tOss('summary', { prs: totalPrs, repos: repos.length })}
            </p>
          </div>

          <div className="flex items-center justify-between sm:flex-col sm:items-end">
            {/* `asChild`, not <Link><Button>: the nested form renders <a><button>, which is
                invalid and costs two tab stops. Slim like the switch under it: `min-h-0` drops the
                44px touch floor, `before:` keeps it as a hit area. */}
            <Button
              variant="link"
              className="relative h-auto min-h-0 p-0 text-sm before:absolute before:-inset-y-3 before:inset-x-0 can-hover:min-h-0 md:mt-1.5 md:text-base"
              asChild
            >
              <Link href={openSourceHref()}>{t('viewAllContributions')}</Link>
            </Button>

            <ViewSwitch
              labels={{
                group: t('viewSwitchLabel'),
                compact: t('viewCompact'),
                details: t('viewDetails'),
              }}
            />
          </div>
        </div>

        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {repos.slice(0, TOP_REPOS).map((repo, index) => (
            <li key={repo.nameWithOwner}>
              <RepoRow
                repo={repo}
                index={index}
                labels={rowLabels}
                formatDate={formatDate}
              />
            </li>
          ))}
        </ul>
      </ViewSwitchRoot>
    </ContentFade>
  );
}
