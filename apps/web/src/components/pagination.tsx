import { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { PaginatedMetadata } from '@/types/api/paginated.type';
import { Button } from '@/components/ui/button';





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
      <p className="text-xs text-muted-foreground font-medium">
        Page {page} of {pagination?.totalPages || 1}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1 || isPlaceholderData}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!pagination?.hasMore || isPlaceholderData}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </footer>
  );
}
