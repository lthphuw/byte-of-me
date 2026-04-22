'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function useBlogFilters() {
  const searchParams = useSearchParams();

  const initialFilters = useMemo(
    () => ({
      tagSlugs: searchParams.get('tags')?.split(',').filter(Boolean) || [],
      search: searchParams.get('q') || '',
    }),
    [searchParams]
  );

  const [filters, setFilters] = useState(initialFilters);

  const updateFilters = (newFilters: typeof initialFilters) => {
    setFilters(newFilters);
  };

  return { filters, updateFilters };
}
