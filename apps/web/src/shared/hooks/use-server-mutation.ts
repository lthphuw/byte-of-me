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
  /** Localised generic failure text: the fallback for every failure (D2). */
  errorMessage: string;
  /** Localised text per `errorCode`, for actions that name their reason. */
  errorMessages?: Partial<Record<string, string>>;
  successMessage?: string;
  /** Keys from the entity factories, invalidated after success. */
  invalidate?: readonly QueryKey[];
  /** Runs only after the envelope check passed. */
  onSuccess?: (data: TData, variables: TVariables) => void;
};

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
      if (successMessage) toast(successMessage);
      onSuccess?.(data, variables);
    },
    onError: (error) => {
      console.error(error);
      const code =
        error instanceof ServerActionError ? error.errorCode : undefined;
      toast.error((code && errorMessages?.[code]) || errorMessage);
    },
  });
}
