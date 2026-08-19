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
 * Calls `onInvalid` with the validation errors under `name` when a SUBMIT
 * ATTEMPT fails — and at no other time.
 *
 * Two things make this the right shape for "a field hidden behind a tab, a
 * collapsible or another tab inside that collapsible never gets seen":
 *
 * - It **subscribes** rather than being told. A parent that owns
 *   `handleSubmit` can only thread its error object down through every level
 *   that might be hiding something; each new level is another prop nobody
 *   remembers to add. Reading the error subtree here covers every nesting
 *   depth with no caller changes.
 * - It keys off `submitCount`, which react-hook-form increments once per
 *   `handleSubmit` call. Reacting to `errors` alone would fire on every
 *   keystroke under `revalidate`, and a tab that switches itself while
 *   somebody is typing in another one is worse than the bug this fixes.
 *
 * `submitCount` starts at 0, so a control that MOUNTS into a form which has
 * already failed a submit reveals itself immediately — which is exactly the
 * case of a collapsible that opens itself and only then mounts the tabs
 * holding the invalid field.
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
