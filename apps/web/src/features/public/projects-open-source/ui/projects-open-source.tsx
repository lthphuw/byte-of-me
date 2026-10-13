'use client';

import { useMemo, useState } from 'react';
import {
  badgeVariants,
  Button,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMediaQuery,
} from '@byte-of-me/ui';
import { ArrowUpRight, GitPullRequest, Star } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import {
  filterLedger,
  groupLedgerByMonth,
  LEDGER_PAGE_SIZE,
  pageLedger,
  toLedger,
} from '@/entities/open-source/model/ledger';
import type { OpenSourceRepo } from '@/entities/open-source/model/types';
import { cn } from '@/shared/lib/utils';
import { FilterSearchInput } from '@/shared/ui';

const ALL_REPOS = '*';

// Hidden for now: the repo picker covers the list today. Set to `true` to show
// the search again; the filter and its strings stay wired.
const SEARCH_ENABLED = false;

/**
 * The merged-PR ledger on `/projects`. One flat list, newest first, filtered
 * by a free-text search and a repo picker, and paged by viewport (5 on a
 * phone, 8 from `md` up). Choosing a repo also shows its name, language, stars
 * and a link to it, since the rows alone only carry `owner/name`. Only the
 * `View` badge on a row links to the PR; the row itself does not.
 *
 * Client component: the search, the picker and the page are local state. The
 * first page is still rendered on the server, so the initial HTML is complete.
 * The server has no viewport, so it renders the phone count and a desktop
 * client swaps to the larger page after hydration.
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
  const [repoFilter, setRepoFilter] = useState(ALL_REPOS);
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
  const compactFormat = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
    [locale]
  );

  const ledger = useMemo(() => toLedger(repos), [repos]);
  const repo = repoFilter === ALL_REPOS ? null : repoFilter;
  const selectedRepo = repos.find((r) => r.nameWithOwner === repo) ?? null;
  const filtered = filterLedger(ledger, { text, repo });
  const { items, pagination } = pageLedger(filtered, page, pageSize);
  const months = groupLedgerByMonth(items);

  const changeText = (value: string) => {
    setText(value);
    setPage(1);
  };
  const changeRepo = (value: string) => {
    setRepoFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row">
        {SEARCH_ENABLED && (
          <FilterSearchInput
            value={text}
            onChange={changeText}
            placeholder={t('searchPlaceholder')}
            clearLabel={t('clearSearch')}
            className="flex-1"
          />
        )}
        <Select value={repoFilter} onValueChange={changeRepo}>
          <SelectTrigger
            aria-label={t('repoLabel')}
            className="h-11 sm:h-9 sm:w-64"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_REPOS}>
              {t('allRepos', { count: ledger.length })}
            </SelectItem>
            {repos.map((item) => (
              <SelectItem key={item.nameWithOwner} value={item.nameWithOwner}>
                {item.nameWithOwner} · {item.prCount}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRepo && (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-start md:p-5">
          <Image
            src={selectedRepo.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-md border"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="break-all text-base font-semibold">
              {selectedRepo.nameWithOwner}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {selectedRepo.language && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full border border-border"
                    style={{
                      backgroundColor:
                        selectedRepo.language.color ?? undefined,
                    }}
                  />
                  {selectedRepo.language.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star aria-hidden className="size-3.5" />
                {compactFormat.format(selectedRepo.stars)}
              </span>
              <span className="tabular-nums">
                {t('prCount', { count: selectedRepo.prCount })}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a
              href={selectedRepo.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('openRepo')}
              <ArrowUpRight aria-hidden className="size-3.5" />
            </a>
          </Button>
        </div>
      )}

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
                  const [owner, name] = item.repo.split('/');

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
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground md:text-[13px]">
                          <span className="min-w-0 break-all">
                            {owner}/
                            <span className="font-medium text-foreground">
                              {name}
                            </span>
                          </span>
                          <span aria-hidden>·</span>
                          <time dateTime={item.mergedAt}>
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
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              badgeVariants({ variant: 'outline' }),
                              'ml-auto shrink-0 gap-1 text-primary transition-colors hover:bg-primary/10'
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
