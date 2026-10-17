'use client';

import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from './button';

interface PaginationProps {
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
  isPlaceholderData?: boolean;
  setPage: Dispatch<SetStateAction<number>>;
  /** Labels. This package has no next-intl context, so the caller translates. */
  pageLabel: string;
  previousLabel: string;
  nextLabel: string;
}

export function Pagination({
  pagination,
  setPage,
  isPlaceholderData,
  pageLabel,
  previousLabel,
  nextLabel,
}: PaginationProps) {
  const page = pagination?.currentPage || 1;

  return (
    <nav
      aria-label={pageLabel}
      className="flex items-center justify-between border-t pt-4"
    >
      <p className="text-xs font-medium text-muted-foreground">{pageLabel}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1 || isPlaceholderData}
        >
          <ChevronLeft /> {previousLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!pagination?.hasMore || isPlaceholderData}
        >
          {nextLabel} <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
