'use client';

import { useQuery } from '@tanstack/react-query';

import { contactMessageQueries } from '@/entities/contact-message/query/contact-message-queries';

export function useContactMessages(page: number, search: string) {
  return useQuery({
    ...contactMessageQueries.list(page, search),
    // Keep the previous page while the next loads, so a page turn does not flash a skeleton.
    placeholderData: (previous) => previous,
  });
}
