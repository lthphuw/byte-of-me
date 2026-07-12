'use client';

import { RevealSection, StaggerItem, StaggerList } from '@/shared/ui';

export function ContactListMotion({ children }: { children: React.ReactNode }) {
  return (
    <StaggerList className="grid grid-cols-1 gap-3">{children}</StaggerList>
  );
}

export function ContactItemMotion({ children }: { children: React.ReactNode }) {
  return <StaggerItem>{children}</StaggerItem>;
}

export function ContactHeaderMotion({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <RevealSection id={id} className="space-y-2 text-center">
      {children}
    </RevealSection>
  );
}
