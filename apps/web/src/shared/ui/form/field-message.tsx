'use client';

import { useFormField } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

const VALIDATION_PREFIX = 'validation.';

export interface FieldMessageProps {
  /** A `validation.<name>` key is translated; any other text is shown as is. */
  message?: string;
}

/**
 * The error text under a field, with the id that `FormControl` names in
 * `aria-describedby`. Render it inside a `FormItem`, as `FormMessage` is.
 */
export function FieldMessage({ message }: FieldMessageProps) {
  const { formMessageId } = useFormField();
  const t = useTranslations('dashboard.validation');

  if (!message) return null;

  const text = message.startsWith(VALIDATION_PREFIX)
    ? t(message.slice(VALIDATION_PREFIX.length) as Parameters<typeof t>[0])
    : message;

  return (
    <p
      id={formMessageId}
      className="text-[0.8rem] font-medium text-destructive-text"
    >
      {text}
    </p>
  );
}
