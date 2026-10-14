'use client';

import { useFormField } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

const VALIDATION_PREFIX = 'validation.';

export interface FieldMessageProps {
  /** Shown in place of the field's own error, e.g. a list-level one. */
  message?: string;
}

/**
 * The error text under a field, with the id that `FormControl` names in
 * `aria-describedby`. Render it inside a `FormItem`. A `validation.<name>` key
 * (what the schemas emit) is translated; any other text is shown as is.
 */
export function FieldMessage({ message }: FieldMessageProps) {
  const { error, formMessageId } = useFormField();
  const t = useTranslations('dashboard.validation');

  const raw = message ?? error?.message;
  if (!raw) return null;

  const text = raw.startsWith(VALIDATION_PREFIX)
    ? t(raw.slice(VALIDATION_PREFIX.length) as Parameters<typeof t>[0])
    : raw;

  return (
    <p
      id={formMessageId}
      className="text-[0.8rem] font-medium text-destructive-text"
    >
      {text}
    </p>
  );
}
