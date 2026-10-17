import type { ReactNode } from 'react';

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from './empty';

interface StateBlockProps {
  title: string;
  description?: string;
  /** A Retry or create button, under the text. */
  action?: ReactNode;
  /** `alert` for a failure that appears after the page has loaded. */
  role?: 'alert';
}

/** The centred block a list, section or form shows instead of its content. */
export function StateBlock({
  title,
  description,
  action,
  role,
}: StateBlockProps) {
  return (
    <div role={role} className="flex justify-center py-20">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          {description && <EmptyDescription>{description}</EmptyDescription>}
        </EmptyHeader>
        {action}
      </Empty>
    </div>
  );
}
