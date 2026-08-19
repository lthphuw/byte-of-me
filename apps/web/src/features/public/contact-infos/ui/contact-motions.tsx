'use client';

import { StaggerItem, StaggerList } from '@/shared/ui';

export function ContactListMotion({ children }: { children: React.ReactNode }) {
  return (
    <StaggerList className="grid grid-cols-1 gap-4 md:gap-6">
      {children}
    </StaggerList>
  );
}

export function ContactItemMotion({ children }: { children: React.ReactNode }) {
  return <StaggerItem>{children}</StaggerItem>;
}
