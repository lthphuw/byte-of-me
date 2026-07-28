'use client';

import { useEffect, useRef } from 'react';
import type { DefaultValues, FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * Single reset strategy for the dashboard edit dialogs: whenever the dialog
 * opens (or the record being edited changes while it is open), reset the form
 * to the mapped record — or, when there is no record, back to the form's own
 * `defaultValues` so no stale value from the previous edit survives.
 */
export function useResetOnOpen<TValues extends FieldValues, TData>(
  form: UseFormReturn<TValues>,
  open: boolean,
  initialData: TData | null | undefined,
  toValues: (data: TData) => DefaultValues<TValues>
) {
  // Call sites declare the mapper inline; keeping it in a ref stops a new
  // function identity from re-resetting the form under the user's fingers.
  const toValuesRef = useRef(toValues);
  toValuesRef.current = toValues;

  useEffect(() => {
    if (!open) return;
    form.reset(initialData ? toValuesRef.current(initialData) : undefined);
  }, [open, initialData, form]);
}
