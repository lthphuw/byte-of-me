import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@byte-of-me/ui';
import { Briefcase } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ExperienceCompanyItem } from './experience-company-item';

import { getAllPublicCompanies } from '@/entities/company';
import { StaggerItem, StaggerList } from '@/shared/ui';
import { ExperienceShell } from '@/widgets/public/experience-content/ui/experience-shell';

export async function ExperienceContent() {
  const t = await getTranslations('experience');
  const companiesResp = await getAllPublicCompanies();
  const companies = companiesResp.success ? companiesResp.data : [];

  if (companies.length === 0) {
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

  return (
    <ExperienceShell>
      <div className="flex justify-center px-0 py-8 md:px-8 md:py-12">
        <div className="w-full max-w-3xl">
          {/* <header className="border-b pb-6">
            <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
              {t('title')}
            </h1>
          </header> */}

          <StaggerList as="ol" className="mt-10">
            {companies.map((company, index) => (
              <StaggerItem as="li" key={company.id}>
                <ExperienceCompanyItem
                  company={company}
                  isLast={index === companies.length - 1}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </div>
    </ExperienceShell>
  );
}
