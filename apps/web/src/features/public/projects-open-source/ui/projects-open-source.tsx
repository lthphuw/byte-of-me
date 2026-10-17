'use client';

import { useMemo, useState } from 'react';
import {
  filterLedger,
  groupLedgerByMonth,
  LEDGER_PAGE_SIZE,
  type OpenSourceRepo,
  pageLedger,
  toLedger,
} from '@byte-of-me/github';
import { badgeVariants, Pagination, useMediaQuery } from '@byte-of-me/ui';
import { ArrowUpRight, GitPullRequest } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { RepoFilterChips } from './repo-filter-chips';

import { cn } from '@/shared/lib/utils';
import { FilterSearchInput } from '@/shared/ui';

// Hidden for now: the repo picker covers the list today. Set to `true` to show
// the search again; the filter and its strings stay wired.
const SEARCH_ENABLED = false;

/**
 * The merged-PR ledger on `/projects`: newest first, search plus repo chips, paged by viewport (5
 * on a phone, 8 from `md`; the server renders 5, desktop swaps after hydration). The repo name
 * links to the repo and the `View` badge to the PR; the row does not link.
 */
export function ProjectsOpenSource({ repos }: { repos: OpenSourceRepo[] }) {
  const t = useTranslations('components.openSource');
  const tPagination = useTranslations('components.pagination');
  const locale = useLocale();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const pageSize = isDesktop
    ? LEDGER_PAGE_SIZE.desktop
    : LEDGER_PAGE_SIZE.mobile;

  const [text, setText] = useState('');
  const [repo, setRepo] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // UTC on purpose: the server renders this and the browser hydrates it, and a
  // PR merged just after midnight UTC must not change day between the two.
  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }),
    [locale]
  );
  const monthFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    [locale]
  );
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const ledger = useMemo(() => toLedger(repos), [repos]);
  const repoUrls = useMemo(
    () => new Map(repos.map((r) => [r.nameWithOwner, r.url])),
    [repos]
  );
  const filtered = filterLedger(ledger, { text, repo });
  const { items, pagination } = pageLedger(filtered, page, pageSize);
  const months = groupLedgerByMonth(items);

  const changeText = (value: string) => {
    setText(value);
    setPage(1);
  };
  const changeRepo = (value: string | null) => {
    setRepo(value);
    setPage(1);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3">
        {SEARCH_ENABLED && (
          <FilterSearchInput
            value={text}
            onChange={changeText}
            placeholder={t('searchPlaceholder')}
            clearLabel={t('clearSearch')}
            className="w-full sm:max-w-xs"
          />
        )}
        <RepoFilterChips
          repos={repos}
          value={repo}
          onChange={changeRepo}
          allLabel={t('allRepos', { count: ledger.length })}
          groupLabel={t('repoLabel')}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <div className="space-y-6">
          {months.map((month) => (
            <section key={month.key}>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {monthFormat.format(new Date(`${month.key}-01T00:00:00Z`))}
              </h3>
              <ul className="divide-y">
                {month.items.map((item) => {
                  return (
                    <li key={item.url} className="flex items-start gap-3 py-4 md:gap-4">
                      <GitPullRequest
                        role="img"
                        aria-label={t('merged')}
                        className="mt-0.5 size-4 shrink-0 text-merged"
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="line-clamp-2 text-sm font-medium leading-snug md:text-[15px]">
                          {item.title}{' '}
                          <span className="whitespace-nowrap font-normal tabular-nums text-muted-foreground">
                            #{item.number}
                          </span>
                        </p>
                        {/* `View` is its own column, not a flex-wrap sibling: a long repo
                            name or date wraps inside the left cell and cannot push it down. */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground md:text-[13px]">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 md:gap-x-2">
                            <RepoLink name={item.repo} url={repoUrls.get(item.repo)} />
                            {/* The dots only exist from md: a wrapped line leaves one dangling. */}
                            <span aria-hidden className="hidden md:inline">
                              ·
                            </span>
                            <time
                              dateTime={item.mergedAt}
                              className="whitespace-nowrap"
                            >
                              {dateFormat.format(new Date(item.mergedAt))}
                            </time>
                            <span aria-hidden className="hidden md:inline">
                              ·
                            </span>
                            <span className="hidden tabular-nums md:inline">
                              <span className="font-medium text-primary">
                                +{numberFormat.format(item.additions)}
                              </span>{' '}
                              −{numberFormat.format(item.deletions)}
                            </span>
                          </div>
                          {/* `before:` is a 44px hit area around the 22px chip; it adds no height. */}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              badgeVariants({ variant: 'outline', interactive: true }),
                              'relative shrink-0 gap-1 text-primary transition-colors hover:bg-primary/10 before:absolute before:inset-x-0 before:-inset-y-3'
                            )}
                          >
                            {t('view')}
                            <ArrowUpRight aria-hidden className="size-3" />
                          </a>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {pagination.totalPages > 1 && (
            <Pagination
              pagination={pagination}
              setPage={setPage}
              pageLabel={tPagination('pageLabel', {
                page: pagination.currentPage,
                totalPages: pagination.totalPages,
              })}
              previousLabel={tPagination('previous')}
              nextLabel={tPagination('next')}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** The repo on a row, a link to GitHub. `before:` is a 44px hit area around the 16px line. */
function RepoLink({ name, url }: { name: string; url: string | undefined }) {
  if (!url) return <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative min-w-0 rounded-sm font-medium text-primary underline underline-offset-4 [overflow-wrap:anywhere] before:absolute before:-inset-y-3.5 before:inset-x-0 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {name}
    </a>
  );
}
