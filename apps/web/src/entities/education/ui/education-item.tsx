import { RichText } from '@byte-of-me/ui/rich-text';
import { GraduationCap } from 'lucide-react';
import Image from 'next/image';

import { AchievementItem } from './achievement-item';

import type { PublicEducation } from '@/entities/education/model/types';

export function EducationItem({ edu }: { edu: PublicEducation }) {
  const startYear = new Date(edu.startDate).getFullYear();
  const endYear = edu.endDate ? new Date(edu.endDate).getFullYear() : null;
  const isOngoing = !endYear;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 md:gap-6">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {edu.logo ? (
            <Image
              src={edu.logo.url}
              alt={edu.title}
              fill
              sizes="48px"
              className="object-contain p-1.5"
            />
          ) : (
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <h3 className="text-base font-semibold leading-snug md:text-lg">
            {edu.title}
          </h3>

          <p className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
            <span className="tabular-nums">
              {startYear} — {endYear ?? 'Present'}
            </span>

            {isOngoing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Ongoing
              </span>
            )}
          </p>
        </div>
      </div>

      {edu.description && (
        <RichText content={edu.description} variant="compact" />
      )}

      {/* Achievements — a timeline rail keeps a long list readable and makes
          the authored order legible at a glance. */}
      {edu.achievements.length > 0 && (
        <ol className="relative space-y-4 pl-5 md:space-y-6 md:pl-6">
          <span
            aria-hidden
            className="absolute bottom-2 left-[3px] top-2 w-px bg-border"
          />

          {edu.achievements.map((a) => (
            <li key={a.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-5 top-[0.4rem] h-[7px] w-[7px] rounded-full border-2 border-background bg-muted-foreground/50 md:-left-6"
              />
              <AchievementItem
                achievement={a}
                // Rendered here, on the server, and handed down as a node.
                content={
                  a.content ? (
                    <RichText content={a.content} variant="compact" />
                  ) : null
                }
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
