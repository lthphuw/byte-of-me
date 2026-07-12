'use client';

import { RevealSection } from '@/shared/ui';

/**
 * Thin wrapper kept for backward compatibility — delegates to the shared
 * {@link RevealSection}.
 */
export function ContactSectionMotion({
  id,
  children,
  delay = 0,
}: {
  id?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <RevealSection id={id} delay={delay}>
      {children}
    </RevealSection>
  );
}
