'use client';

import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@byte-of-me/ui';
import { useRouter } from 'next/navigation';

export type SectionLoadErrorProps = {
  title: string;
  description?: string;
  /** Given only on a dynamic route, where a retry re-runs the read. */
  retryLabel?: string;
};

/**
 * The error state for a section whose read failed. Retry calls `router.refresh()`,
 * which re-runs the Server Components of a dynamic route. A statically prerendered
 * route re-serves the same HTML, so a static section passes no `retryLabel`.
 */
export function SectionLoadError({
  title,
  description,
  retryLabel,
}: SectionLoadErrorProps) {
  const router = useRouter();

  return (
    <div className="flex justify-center py-20">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          {description && <EmptyDescription>{description}</EmptyDescription>}
        </EmptyHeader>
        {retryLabel && (
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            {retryLabel}
          </Button>
        )}
      </Empty>
    </div>
  );
}
