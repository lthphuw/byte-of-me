'use client';

import { useEffect, useRef } from 'react';
import {
  type Control,
  type FieldPath,
  type FieldValues,
  get,
  useFormState,
} from 'react-hook-form';

/**
 * Calls `onInvalid` with the errors under `name` when a SUBMIT ATTEMPT fails, never otherwise.
 * It subscribes (no prop threaded through each level hiding a field) and keys off
 * `submitCount`, so a control mounting after a failed submit reveals itself at once.
 */
export function useRevealOnInvalidSubmit<T extends FieldValues>(
  control: Control<T>,
  name: FieldPath<T>,
  onInvalid: (errors: unknown) => void
): void {
  const { errors, submitCount } = useFormState({ control, name });

  // A fresh closure every render, so the effect below reads it at call time
  // instead of re-running whenever the caller re-renders.
  const onInvalidRef = useRef(onInvalid);
  onInvalidRef.current = onInvalid;

  const revealedForSubmitRef = useRef(0);

  useEffect(() => {
    if (submitCount === revealedForSubmitRef.current) return;
    revealedForSubmitRef.current = submitCount;

    const scoped: unknown = get(errors, name);
    if (scoped != null) onInvalidRef.current(scoped);
  }, [submitCount, errors, name]);
}
