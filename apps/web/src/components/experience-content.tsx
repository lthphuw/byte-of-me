'use client';

import Image from 'next/image';
import { Company } from '@/models/company';
import { format } from 'date-fns';
import { Briefcase } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';

export interface ExperienceContentProps {
  companies: Company[];
}

export function ExperienceContent({ companies }: ExperienceContentProps) {
  if (!companies || companies.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Briefcase />
          </EmptyMedia>
          <EmptyTitle>Updating experience...</EmptyTitle>
        </EmptyHeader>
        <EmptyDescription>
          The professional log is being refreshed. Please check back in a moment.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {companies.map((company) => (
        <Card key={company.id} className="border-muted">
          <CardContent className="p-4 md:p-6 space-y-4">
            {/* Company Header */}
            <div className="flex items-start gap-4">
              {company.logo?.url ? (
                <Image
                  src={company.logo.url}
                  alt={company.company}
                  width={48}
                  height={48}
                  className="rounded-md object-contain border bg-background"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                  <h3 className="font-semibold text-base md:text-lg truncate">
                    {company.company}
                  </h3>

                  <span className="text-xs text-muted-foreground">
                    {format(new Date(company.startDate), 'MMM yyyy')} -{' '}
                    {company.endDate
                      ? format(new Date(company.endDate), 'MMM yyyy')
                      : 'Present'}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  {company.location}
                </p>
              </div>
            </div>

            {/* Description */}
            {company.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {company.description}
              </p>
            )}

            {/* Roles */}
            {company.roles?.length > 0 && (
              <div className="space-y-4">
                <Separator />

                {company.roles.map((role) => (
                  <div key={role.id} className="space-y-2">
                    {/* Role Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                      <h4 className="font-medium text-sm md:text-base">
                        {role.title || 'Untitled Role'}
                      </h4>

                      <span className="text-xs text-muted-foreground">
                        {role.startDate
                          ? format(new Date(role.startDate), 'MMM yyyy')
                          : ''}
                        {' - '}
                        {role.endDate
                          ? format(new Date(role.endDate), 'MMM yyyy')
                          : 'Present'}
                      </span>
                    </div>

                    {/* Role Description */}
                    {role.description && (
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    )}

                    {/* Tasks */}
                    {role.tasks?.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {role.tasks.map((task) => (
                          <li key={task.id}>{task.content}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
