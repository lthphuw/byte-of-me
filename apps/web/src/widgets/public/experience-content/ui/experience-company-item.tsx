import { Briefcase } from 'lucide-react';
import Image from 'next/image';

import type { PublicCompany } from '@/entities/company/model';
import { cn } from '@/shared/lib/utils';

function year(date: Maybe<Date>): string {
  return date ? String(new Date(date).getFullYear()) : '';
}

/** Renders a year range as "2022 — Present", flagging an open end date. */
function DateRange({
  start,
  end,
  className,
}: {
  start: Maybe<Date>;
  end: Maybe<Date>;
  className?: string;
}) {
  if (!start && !end) return null;
  const isPresent = !!start && !end;

  return (
    <span
      className={cn(
        'shrink-0 font-mono tabular-nums text-muted-foreground',
        className
      )}
    >
      {year(start)}
      {(year(start) || isPresent) && ' — '}
      <span className={cn(isPresent && 'text-primary')}>
        {end ? year(end) : 'Present'}
      </span>
    </span>
  );
}

export function ExperienceCompanyItem({
  company,
  isLast,
}: {
  company: PublicCompany;
  isLast: boolean;
}) {
  const isCurrent = !company.endDate;

  return (
    // The wrapping <li> is provided by the StaggerItem in ExperienceContent.
    <div className="relative grid grid-cols-[3rem_1fr] gap-x-4 md:grid-cols-[3.5rem_1fr] md:gap-x-6">
      {/* Marker column: the connector rail + the company logo as its node */}
      <div className="relative flex justify-center">
        {!isLast && (
          <span
            aria-hidden
            className="absolute bottom-0 left-1/2 top-8 w-px -translate-x-1/2 bg-border"
          />
        )}

        <div
          className={cn(
            'relative z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border bg-card md:h-14 md:w-14',
            isCurrent && 'border-primary/40 ring-2 ring-primary/20'
          )}
        >
          {company.logo ? (
            <Image
              src={company.logo.url}
              alt={company.company}
              fill
              sizes="56px"
              className="object-contain p-2"
            />
          ) : (
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn('min-w-0', isLast ? 'pb-0' : 'pb-8 md:pb-12')}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">
            {company.company}
          </h2>
          <DateRange
            start={company.startDate}
            end={company.endDate}
            className="text-xs"
          />
        </div>

        {company.location && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {company.location}
          </p>
        )}

        {company.description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {company.description}
          </p>
        )}

        {/* Roles */}
        {company.roles.length > 0 && (
          <div className="mt-6 space-y-4 border-l border-dashed border-border pl-5 md:space-y-6 md:pl-6">
            {company.roles.map((role) => (
              <div key={role.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-5 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-border ring-4 ring-background md:-left-6"
                />

                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h3 className="font-medium text-foreground">{role.title}</h3>
                  <DateRange
                    start={role.startDate}
                    end={role.endDate}
                    className="text-[11px]"
                  />
                </div>

                {role.description && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {role.description}
                  </p>
                )}

                {role.tasks.length > 0 && (
                  <ul className="mt-2.5 space-y-2">
                    {role.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="relative pl-4 text-sm leading-relaxed text-muted-foreground before:absolute before:left-0 before:top-[0.6rem] before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/40"
                      >
                        {task.content}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
