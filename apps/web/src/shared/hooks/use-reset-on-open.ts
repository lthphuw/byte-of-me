'use client';

import { useEffect, useRef } from 'react';
import type {
  DefaultValues,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form';

/**
 * Reset strategy for the small edit dialogs that keep their form mounted
 * across opens (tags, tech stacks): on open, or when the record changes, reset
 * to the mapped record, or to `defaultValues` when there is none. Dialogs with
 * editors seed `useForm` at mount instead — a reset regenerates field-array ids.
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
