'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

type EditingRecordOptions<TRecord> = {
  /** The row being edited; `null` for "new" or a closed dialog, which fetches nothing. */
  id: string | null;
  /** The entity's `detail` key factory. */
  queryKey: (id: string) => readonly unknown[];
  fetchRecord: (id: string) => Promise<ApiResponse<TRecord>>;
};

/**
 * The full record behind an admin list row, for the edit dialog. Mount the form
 * only once `record` is set (`isNotReady` covers loading, failed and idle), or a
 * save could overwrite real content with what the partial row left out.
 */
export function useEditingRecord<TRecord>({
  id,
  queryKey,
  fetchRecord,
}: EditingRecordOptions<TRecord>) {
  const query = useQuery({
    queryKey: queryKey(id ?? ''),
    queryFn: async () => unwrapApiResponse(await fetchRecord(id ?? '')),
    enabled: id !== null,
    // The form seeds once per record, so a refetch could only discard edits.
    refetchOnWindowFocus: false,
    // A failed read is deterministic (gone, forbidden): show it at once, let
    // the author press Retry rather than sit behind the default retry delay.
    retry: false,
  });

  const record = id === null ? null : query.data ?? null;

  return {
    record,
    isNotReady: id !== null && record === null,
    hasError: id !== null && record === null && query.isError,
    retry: () => {
      void query.refetch();
    },
  };
}
