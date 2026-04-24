import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { PaginatedMetadata } from '@/shared/types/api/paginated-api.type';
import { Button } from '@/shared/ui';

export interface PaginationProps {
  pagination?: PaginatedMetadata;
  isPlaceholderData?: boolean;
  setPage: Dispatch<SetStateAction<number>>;
}
export function Pagination({
  pagination,
  setPage,
  isPlaceholderData,
}: PaginationProps) {
  const page = pagination?.currentPage || 1;

  return (
    <footer className="flex items-center justify-between border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">
        Page {page} of {pagination?.totalPages || 1}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1 || isPlaceholderData}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!pagination?.hasMore || isPlaceholderData}
        >
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </footer>
  );
}
