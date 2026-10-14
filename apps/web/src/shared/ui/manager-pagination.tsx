'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Pagination } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

interface ManagerPaginationProps {
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
  isPlaceholderData?: boolean;
  setPage: Dispatch<SetStateAction<number>>;
  /** For a list whose rows have no gap of their own above the pager. */
  className?: string;
}

/** The dashboard's pager: drawn only past the first page, labels supplied. */
export function ManagerPagination({
  pagination,
  isPlaceholderData,
  setPage,
  className,
}: ManagerPaginationProps) {
  const t = useTranslations('dashboard.shared.pagination');

  if (!pagination || pagination.totalPages <= 1) return null;

  const pager = (
    <Pagination
      pagination={pagination}
      setPage={setPage}
      isPlaceholderData={isPlaceholderData}
      pageLabel={t('pageLabel', {
        page: pagination.currentPage,
        totalPages: pagination.totalPages,
      })}
      previousLabel={t('previous')}
      nextLabel={t('next')}
    />
  );

  return className ? <div className={className}>{pager}</div> : pager;
}
