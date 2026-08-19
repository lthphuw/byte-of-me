'use client';

import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from './button';

export type PaginatedMetadata = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
};

export interface PaginationProps {
  pagination?: PaginatedMetadata;
  isPlaceholderData?: boolean;
  setPage: Dispatch<SetStateAction<number>>;
  /**
   * Labels. This package has no next-intl context, so the caller interpolates
   * and translates; the English defaults keep untranslated call sites working.
   */
  pageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}
export function Pagination({
  pagination,
  setPage,
  isPlaceholderData,
  pageLabel,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: PaginationProps) {
  const page = pagination?.currentPage || 1;
  const totalPages = pagination?.totalPages || 1;

  return (
    <footer className="flex items-center justify-between border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">
        {pageLabel ?? `Page ${page} of ${totalPages}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1 || isPlaceholderData}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> {previousLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!pagination?.hasMore || isPlaceholderData}
        >
          {nextLabel} <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </footer>
  );
}
