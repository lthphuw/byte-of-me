import { RichText } from '@byte-of-me/ui/rich-text';
import { Award, ChevronDown, GraduationCap } from 'lucide-react';
import Image from 'next/image';

import { AchievementItem } from './achievement-item';

import type { PublicEducation } from '@/entities/education/model/types';

export function EducationItem({
  edu,
  labels,
  visibleAchievements = Infinity,
}: {
  edu: PublicEducation;
  /** Copy passed in by the feature: an entity must not pick a namespace. */
  labels: {
    present: string;
    ongoing: string;
    /** "3 more achievements": the summary of the collapsed remainder. */
    moreAchievements: (count: number) => string;
    showLess: string;
  };
  /**
   * How many achievements show before the rest fold into a native `<details>`.
   * The page stays short while every achievement is still one click away and
   * still in the HTML.
   */
  visibleAchievements?: number;
}) {
  const startYear = new Date(edu.startDate).getFullYear();
  const endYear = edu.endDate ? new Date(edu.endDate).getFullYear() : null;
  const isOngoing = !endYear;
  const shown = edu.achievements.slice(0, visibleAchievements);
  const folded = edu.achievements.slice(visibleAchievements);

  const renderAchievement = (a: PublicEducation['achievements'][number]) => (
    <li key={a.id} className="flex gap-3 px-4 py-4 md:gap-4 md:px-5">
      <Award
        aria-hidden
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground md:mt-1"
      />
      <div className="min-w-0 flex-1">
        <AchievementItem
          achievement={a}
          // Rendered here, on the server, and handed down as a node.
          content={
            a.content ? (
              <RichText content={a.content} variant="compact" />
            ) : null
          }
        />
      </div>
    </li>
  );

  return (
    // One card per school, the same surface the Open source list uses: a head
    // (who and when), the description, then the achievements as ruled rows. One
    // column with one padding keeps the left edges aligned top to bottom.
    <article className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-start gap-3 p-4 md:gap-4 md:p-5">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 md:h-12 md:w-12">
          {edu.logo ? (
            <Image
              src={edu.logo.url}
              alt=""
              fill
              sizes="48px"
              className="object-contain p-1.5"
            />
          ) : (
            <GraduationCap
              aria-hidden
              className="h-5 w-5 text-muted-foreground"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-base font-semibold leading-snug md:text-lg">
            {edu.title}
          </h3>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground md:text-sm">
            <span className="tabular-nums">
              {startYear} — {endYear ?? labels.present}
            </span>

            {isOngoing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {labels.ongoing}
              </span>
            )}
          </p>
        </div>
      </header>

      {edu.description && (
        <div className="px-4 pb-4 md:px-5 md:pb-5">
          <RichText content={edu.description} variant="compact" />
        </div>
      )}

      {/* Past `visibleAchievements` the rest fold into a native <details>:
          stateless, keyboard-correct and still in the markup for find-in-page. */}
      {edu.achievements.length > 0 && (
        <>
          <ul className="divide-y border-t">{shown.map(renderAchievement)}</ul>

          {folded.length > 0 && (
            <details className="group border-t">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-primary transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5 [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">
                  {labels.moreAchievements(folded.length)}
                </span>
                <span className="hidden group-open:inline">
                  {labels.showLess}
                </span>
                <ChevronDown
                  aria-hidden
                  className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>

              <ul className="divide-y border-t">
                {folded.map(renderAchievement)}
              </ul>
            </details>
          )}
        </>
      )}
    </article>
  );
}
