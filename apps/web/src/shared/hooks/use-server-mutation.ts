'use client';

import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  ServerActionError,
  unwrapApiResponse,
} from '@/shared/lib/query/unwrap-api-response';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export type ServerMutationOptions<TVariables, TData> = {
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>;
  /**
   * Localised generic failure text, the fallback for every failure (D2). Omit
   * it for a background write that must stay silent: the failure is logged only.
   */
  errorMessage?: string;
  /** Localised text per `errorCode`, for actions that name their reason. */
  errorMessages?: Partial<Record<string, string>>;
  successMessage?: string;
  /** Keys from the entity factories, invalidated after success. */
  invalidate?: readonly QueryKey[];
  /** Runs only after the envelope check passed. */
  onSuccess?: (data: TData, variables: TVariables) => void;
};

/**
 * A server action that calls `redirect()` rejects its promise with a
 * `NEXT_REDIRECT;` digest. The navigation has already started, so the
 * rejection is not a failure and must not toast as one.
 */
export function isRedirectSignal(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT;')
  );
}

/**
 * The one client write path: unwraps the envelope, so `onSuccess` runs only
 * for `success: true`, and turns a refusal into a localised toast.
 */
export function useServerMutation<TVariables, TData>({
  mutationFn,
  errorMessage,
  errorMessages,
  successMessage,
  invalidate = [],
  onSuccess,
}: ServerMutationOptions<TVariables, TData>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) =>
      unwrapApiResponse(await mutationFn(variables)),
    onSuccess: (data, variables) => {
      for (const queryKey of invalidate) {
        queryClient.invalidateQueries({ queryKey });
      }
      if (successMessage) toast.success(successMessage);
      onSuccess?.(data, variables);
    },
    onError: (error) => {
      if (isRedirectSignal(error)) return;
      console.error(error);
      const code =
        error instanceof ServerActionError ? error.errorCode : undefined;
      const message = (code && errorMessages?.[code]) || errorMessage;
      if (message) toast.error(message);
    },
  });
}
