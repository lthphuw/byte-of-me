'use client';

import { type ReactNode, useState } from 'react';
import { List, ListTree } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { SegmentPill } from '@/shared/ui';

type View = 'compact' | 'details';

export interface OpenSourceViewLabels {
  group: string;
  compact: string;
  details: string;
}

/**
 * The section shell and the Compact / Details switch. The view is one `data-view` on the section;
 * the repo rows are server markup handed in as `children` and read it through `group-data-` (see
 * `view-region.tsx`), so the switch costs no row JavaScript and starts in Compact in the HTML.
 * The right column is as tall as the title and summary beside it: link on top, switch below.
 */
export function OpenSourceView({
  intro,
  link,
  labels,
  children,
}: {
  intro: ReactNode;
  link: ReactNode;
  labels: OpenSourceViewLabels;
  children: ReactNode;
}) {
  const [view, setView] = useState<View>('compact');

  return (
    <section
      id="open-source"
      data-view={view}
      className="group/os space-y-6 md:space-y-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between md:gap-8">
        {intro}

        <div className="flex items-center justify-between sm:flex-col sm:items-end">
          {link}

          <div
            role="group"
            aria-label={labels.group}
            className="relative isolate inline-grid grid-cols-2 rounded-lg bg-muted p-0.5 text-muted-foreground"
          >
            <SegmentPill
              end={view === 'details'}
              className="inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)]"
            />
            <ViewButton
              active={view === 'compact'}
              label={labels.compact}
              onClick={() => setView('compact')}
            >
              <List aria-hidden className="size-4" />
            </ViewButton>
            <ViewButton
              active={view === 'details'}
              label={labels.details}
              onClick={() => setView('details')}
            >
              <ListTree aria-hidden className="size-4" />
            </ViewButton>
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}

// `before:` is the 44px touch floor as a hit area: the button stays 24px tall.
function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'relative grid h-6 w-9 place-items-center rounded-md ring-offset-background transition-colors duration-200 before:absolute before:-inset-x-1 before:-inset-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active && 'text-foreground'
      )}
    >
      {children}
    </button>
  );
}
