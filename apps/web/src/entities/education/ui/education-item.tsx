import { RichText } from '@byte-of-me/rich-text-render/rich-text';
import { Award, Ellipsis, GraduationCap } from 'lucide-react';
import Image from 'next/image';

import { AchievementFold, AchievementFoldToggle } from './achievement-fold';
import { AchievementItem } from './achievement-item';

import type { PublicEducation } from '@/entities/education/model/types';
import { cn } from '@/shared/lib/utils';
import { MediaFrame } from '@/shared/ui/media-cover';
import { TREE_NODE, TreeItem, TreeRail, TreeStub } from '@/shared/ui/tree';
import { ViewInline, ViewRegion } from '@/shared/ui/view-region';

// The tree's geometry (phone / from md), read by `TreeItem`, `TreeStub` and `TreeRail`: the trunk
// on the logo's axis (padding plus half the 36 / 40px logo), a node 8 / 12px on, the first
// line of a row 12px down plus half its 20 / 22px line, the trunk leaving the logo 3px under it.
const TREE_VARS =
  'group/tree [--cy:22px] [--nx:42px] [--r:8px] [--stub-top:calc(50%_+_21px)] [--tx:34px] md:[--cy:23px] md:[--nx:52px] md:[--r:10px] md:[--stub-top:calc(50%_+_23px)] md:[--tx:40px]';

// The text column of the header (padding, logo, gap): the description, the rows and the toggle
// all start on it.
const COLUMN = 'pl-16 pr-4 md:pl-[76px] md:pr-5';

export function EducationItem({
  edu,
  index,
  labels,
  visibleAchievements = Infinity,
}: {
  edu: PublicEducation;
  /** Position in the list: staggers the open of the body. */
  index: number;
  /** Copy passed in by the feature: an entity must not pick a namespace. */
  labels: {
    present: string;
    ongoing: string;
    /** "5 achievements": the count in Compact, read aloud. */
    achievementCount: (count: number) => string;
    /** "3 more achievements": the summary of the collapsed remainder. */
    moreAchievements: (count: number) => string;
    showLess: string;
  };
  /**
   * How many achievements show before the rest fold behind a toggle.
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
  const hasTree = edu.achievements.length > 0;
  const hasBody = Boolean(edu.description) || hasTree;

  const renderAchievement = (a: PublicEducation['achievements'][number]) => (
    <>
      <Award
        aria-hidden
        className={cn(
          TREE_NODE,
          'text-muted-foreground transition-colors duration-150 group-hover/pr:text-primary'
        )}
      />
      <AchievementItem
        achievement={a}
        // Rendered here, on the server, and handed down as a node.
        content={
          a.content ? <RichText content={a.content} variant="compact" /> : null
        }
      />
    </>
  );

  return (
    // One row per school in the section's card, the same surface the Open source list uses.
    // Compact is the head alone; Details opens the description and the achievements under it,
    // as the school's tree.
    <article className={TREE_VARS}>
      <header className="relative flex items-center gap-3 px-4 py-3 md:gap-4 md:px-5">
        {hasTree && <TreeStub tone="primary" delay={index * 50} />}

        <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 md:size-10">
          {edu.logo ? (
            <MediaFrame className="size-full">
              <Image
                src={edu.logo.url}
                alt=""
                fill
                sizes="40px"
                className="object-contain p-1.5"
              />
            </MediaFrame>
          ) : (
            <GraduationCap
              aria-hidden
              className="h-5 w-5 text-muted-foreground"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 md:text-base md:leading-[22px]">
            {edu.title}
          </h3>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-4 text-muted-foreground md:text-[13px]">
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

        {hasTree && (
          <ViewInline>
            <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
              <Award aria-hidden className="size-3.5" />
              <span aria-hidden>{edu.achievements.length}</span>
              <span className="sr-only">
                {labels.achievementCount(edu.achievements.length)}
              </span>
            </span>
          </ViewInline>
        )}
      </header>

      {hasBody && (
        <ViewRegion show="details" index={index}>
          {edu.description &&
            (hasTree ? (
              <TreeRail tone="primary" className={cn('pb-3', COLUMN)}>
                <RichText content={edu.description} variant="compact" />
              </TreeRail>
            ) : (
              <div className={cn('pb-3', COLUMN)}>
                <RichText content={edu.description} variant="compact" />
              </div>
            ))}

          {/* Past `visibleAchievements` the rest fold behind the last row. They stay siblings of
              the shown ones, so the trunk and the hover path run through them. */}
          {hasTree && (
            <AchievementFold>
              <ul className="pb-1">
                {shown.map((a, row) => (
                  <TreeItem
                    key={a.id}
                    tone="primary"
                    through={row < shown.length - 1 || folded.length > 0}
                    className={cn('py-3', COLUMN)}
                  >
                    {renderAchievement(a)}
                  </TreeItem>
                ))}

                {folded.map((a, i) => (
                  <TreeItem
                    key={a.id}
                    tone="primary"
                    fold
                    through
                    className={cn('py-3', COLUMN)}
                  >
                    {renderAchievement(a)}
                  </TreeItem>
                ))}

                {folded.length > 0 && (
                  <TreeItem
                    tone="primary"
                    dashed
                    className={cn(
                      'flex min-h-9 items-center [--cy:18px]',
                      COLUMN
                    )}
                  >
                    <Ellipsis
                      aria-hidden
                      className={cn(TREE_NODE, 'text-muted-foreground')}
                    />
                    <AchievementFoldToggle
                      showMoreLabel={labels.moreAchievements(folded.length)}
                      showLessLabel={labels.showLess}
                    />
                  </TreeItem>
                )}
              </ul>
            </AchievementFold>
          )}
        </ViewRegion>
      )}
    </article>
  );
}
