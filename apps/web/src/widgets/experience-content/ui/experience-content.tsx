'use client';

import { Briefcase } from 'lucide-react';

import type { PublicCompany } from '@/entities/company/model';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/ui/empty';
import { ExperienceShell } from '@/widgets/experience-content/ui/experience-shell';

export function ExperienceContent() {
  const companies: PublicCompany[] = [];

  if (!companies || companies.length === 0) {
    return (
      <ExperienceShell>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>Updating experience...</EmptyTitle>
          </EmptyHeader>
          <EmptyDescription>
            The professional log is being refreshed. Please check back in a
            moment.
          </EmptyDescription>
        </Empty>
      </ExperienceShell>
    );
  }

  return <ExperienceShell>null</ExperienceShell>;
}
