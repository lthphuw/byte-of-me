'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { List, ListTree } from 'lucide-react';

import { SegmentPill } from './segment-pill';

import { cn } from '@/shared/lib/utils';

type View = 'compact' | 'details';

interface ViewState {
  view: View;
  setView: (view: View) => void;
}

const ViewContext = createContext<ViewState | null>(null);

/**
 * A section with a Compact / Details switch. The view is one `data-view` on the section and
 * `group/view` names it; the rows are server markup handed in as `children` and read the view
 * through `group-data-[view=details]/view:` (`view-region.tsx`, `tree.tsx`), so the switch costs
 * no row JavaScript and the HTML starts in Compact. Put a `ViewSwitch` anywhere inside.
 */
export function ViewSwitchRoot({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const [view, setView] = useState<View>('compact');
  const state = useMemo(() => ({ view, setView }), [view]);

  return (
    <ViewContext.Provider value={state}>
      <section
        id={id}
        data-view={view}
        className={cn('group/view', className)}
      >
        {children}
      </section>
    </ViewContext.Provider>
  );
}

export interface ViewSwitchLabels {
  group: string;
  compact: string;
  details: string;
}

/** The icon-only switch: `aria-pressed` buttons in a group (no tabpanel, so not a tablist). */
export function ViewSwitch({ labels }: { labels: ViewSwitchLabels }) {
  const state = useContext(ViewContext);
  if (!state) throw new Error('ViewSwitch must sit inside a ViewSwitchRoot');
  const { view, setView } = state;

  return (
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
