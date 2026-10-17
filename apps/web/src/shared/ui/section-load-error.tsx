'use client';

import { Button, StateBlock } from '@byte-of-me/ui';
import { useRouter } from 'next/navigation';

type SectionLoadErrorProps = {
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
    <StateBlock
      title={title}
      description={description}
      action={
        retryLabel && (
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            {retryLabel}
          </Button>
        )
      }
    />
  );
}
