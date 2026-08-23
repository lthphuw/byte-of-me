'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
  useMediaQuery,
} from '@byte-of-me/ui';
import { scrollIntoViewBehavior } from '@byte-of-me/ui/lib/prefers-reduced-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SleepDetailsFields } from './sleep-details-fields';

import type { useSleepEntry } from '@/features/health/sleep-entry/model/use-sleep-entry';
import { cn } from '@/shared/lib/utils';

/** The width at which `/space` shows its icon rail and this screen becomes two
 *  columns — the same `lg` the rest of the module switches at, written as a
 *  query because JavaScript has to decide which container mounts. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Everything the morning flow does not need, behind one tap.
 *
 * Seven fields stacked vertically made a once-a-morning task look like a form
 * to be filled in. Bedtime, wake time and quality are the whole common path;
 * time-to-fall-asleep, minutes awake, the factor tiles, the free-day flag and
 * the note are corrections and context.
 *
 * **Two containers, one set of fields.** On a phone the tap opens a BOTTOM
 * SHEET — the details are a detour off the main flow, and a sheet says that in
 * a way an inline expander does not: it comes up under the thumb, it dims what
 * it interrupted, Escape and a tap outside both back out of it, and the page
 * behind it does not grow by 400px and throw the save bar off screen. At `lg`
 * a modal over a half-empty two-column layout would be theatre, so the same
 * fields stay an inline panel that expands in place.
 *
 * Which one mounts is decided by `useMediaQuery`, not by `lg:hidden`, because
 * these fields carry ids: two copies means a duplicate `#sleep-latency` and a
 * `<label for>` bound to whichever came first. The trigger is the same
 * component in both branches and both start closed, so the first client render
 * and the SSR output draw the same box — the hook starts `false`, corrects
 * after mount, and there is nothing visible to correct.
 *
 * **The section has to be FOUND**, or efficiency is never computable again:
 * latency and minutes awake are the two inputs that entitle the screens to
 * print an efficiency figure at all, and a closed section nobody opens is the
 * same as deleting them. Three things work against that — the trigger names
 * what is inside rather than saying only "Details", it counts the fields
 * already answered, and while efficiency is still uncomputable it says so
 * underneath, at rest, on the closed trigger.
 */
export function SleepDetailsSection({
  entry,
}: {
  entry: ReturnType<typeof useSleepEntry>;
}) {
  const t = useTranslations('dashboard.health');
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const filledCount =
    (entry.latency.trim() === '' ? 0 : 1) +
    (entry.awakenings.trim() === '' ? 0 : 1) +
    (entry.factors.length === 0 ? 0 : 1) +
    (entry.note.trim() === '' ? 0 : 1);

  const efficiencyUnavailable =
    entry.latency.trim() === '' && entry.awakenings.trim() === '';

  // Opened content lands below the fold often enough that the tap otherwise
  // appears to do nothing. `block: 'nearest'` moves the page only when the
  // panel is actually cut off, and the behaviour comes from the shared helper
  // because a literal `'smooth'` animates whatever the user's reduced-motion
  // setting says (§14). Only the inline panel needs this — a sheet is already
  // pinned to the bottom of the viewport.
  useEffect(() => {
    if (!open || !isDesktop) return;

    contentRef.current?.scrollIntoView({
      behavior: scrollIntoViewBehavior(),
      block: 'nearest',
    });
  }, [open, isDesktop]);

  const trigger = (
    <DetailsTrigger
      title={t('sleep.details')}
      summary={t('sleep.detailsSummary')}
      badge={
        filledCount > 0 ? t('sleep.detailsFilled', { n: filledCount }) : null
      }
      hint={efficiencyUnavailable ? t('sleep.detailsEfficiencyHint') : null}
      open={open}
    />
  );

  if (isDesktop) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>{trigger}</CollapsibleTrigger>

        <CollapsibleContent ref={contentRef}>
          <div className="mt-3 rounded-3xl border bg-card p-5 shadow">
            <SleepDetailsFields entry={entry} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      {/* `hideClose`, and a full-width Done instead: the built-in X sits
          `right-2 top-2`, which on a bottom sheet is the far corner from the
          thumb that opened it. Escape and a tap on the overlay still dismiss.
          `88svh` rather than `88vh` — on iOS Safari `vh` is the tall viewport,
          so a sheet sized in `vh` puts its own footer under the browser's
          toolbar, which is where the only visible way out of it lives.

          `motion-reduce:animate-none` because the slide-up is a CSS animation
          from `tailwindcss-animate`, and `MotionConfig reducedMotion="user"`
          covers framer-motion only (§14). Radix's `Presence` reads the
          computed `animation-name` to decide when to unmount, so removing the
          animation makes the sheet appear and vanish at once rather than
          leaving it mounted. */}
      <SheetContent
        side="bottom"
        hideClose
        className="flex max-h-[88svh] flex-col gap-0 rounded-t-3xl p-0 motion-reduce:animate-none"
      >
        <span
          aria-hidden
          className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30"
        />

        <div className="shrink-0 space-y-1 px-5 pb-4 pt-4 text-left">
          <SheetTitle>{t('sleep.details')}</SheetTitle>
          <SheetDescription>{t('sleep.detailsSummary')}</SheetDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <SleepDetailsFields entry={entry} />
        </div>

        {/* Outside the scroll area and clear of the home indicator, exactly
            like the form's own save bar — a sheet whose only control scrolls
            away is a sheet the reader has to hunt for a way out of. */}
        <SheetFooter className="shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <SheetClose asChild>
            <Button type="button" className="h-14 w-full rounded-2xl text-base">
              {t('sleep.detailsDone')}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The one closed card both containers open from.
 *
 * A `forwardRef` button because Radix's `Collapsible.Trigger` and
 * `Sheet.Trigger` both take it `asChild` — they merge their own props and a
 * ref onto whatever element is handed to them, and a component that drops
 * either one silently stops opening.
 *
 * Identical markup on both sides is the point: `useMediaQuery` cannot answer
 * before mount, so the desktop reader sees the phone branch for one frame.
 * With the same trigger in both, that frame is indistinguishable from the
 * next one.
 */
const DetailsTrigger = forwardRef<
  HTMLButtonElement,
  {
    title: string;
    summary: string;
    /** How many of the fields inside already have a value. */
    badge: string | null;
    /** Why opening this matters, while it still does. */
    hint: string | null;
    open: boolean;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ title, summary, badge, hint, open, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      'w-full rounded-3xl border bg-card px-5 py-4 text-left shadow',
      'transition-colors duration-200 hover:bg-muted',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      className
    )}
    {...props}
  >
    <span className="flex items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {badge ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary-foreground">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {summary}
        </span>
      </span>

      <ChevronDown
        aria-hidden
        className={cn(
          'size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
          open && 'rotate-180'
        )}
      />
    </span>

    {hint ? (
      <span className="mt-2 block text-xs text-muted-foreground">{hint}</span>
    ) : null}
  </button>
));
DetailsTrigger.displayName = 'DetailsTrigger';
