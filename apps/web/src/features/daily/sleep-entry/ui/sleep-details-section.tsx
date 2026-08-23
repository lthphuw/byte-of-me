'use client';

import { useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { PanelBottomOpen, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SleepDetailsFields } from './sleep-details-fields';

import type { useSleepEntry } from '@/features/daily/sleep-entry/model/use-sleep-entry';
import { cn } from '@/shared/lib/utils';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/**
 * Everything the morning flow does not need, behind one tap.
 *
 * Seven fields stacked vertically made a once-a-morning task look like a form
 * to be filled in. Bedtime, wake time and quality are the whole common path;
 * time-to-fall-asleep, minutes awake, the factor tiles, the free-day flag and
 * the note are corrections and context.
 *
 * **It opens OVER the page at every width now.** This used to be a bottom
 * sheet on a phone and an inline `Collapsible` at `lg`, and the expander was
 * the defect the owner reported: opening Details grew the column by ~400px and
 * pushed the Save button — and the statistics beside it — down the page, so
 * the control the reader was heading for moved while they were looking at it.
 * `ResponsiveModal` is the pattern the gym surface already opens all five of
 * its forms with, and its own documentation names this exact failure. Below
 * `lg` it is still the bottom sheet this section always had; at `lg` it is a
 * centred dialog instead of an expander. One component, so the two halves of
 * the module cannot drift apart again.
 *
 * That also deletes the scroll-into-view effect this file used to need. An
 * expander could open below the fold and appear to do nothing; a modal is
 * placed by the viewport and has nowhere to hide.
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
  const [open, setOpen] = useState(false);

  const filledCount =
    (entry.latency.trim() === '' ? 0 : 1) +
    (entry.awakenings.trim() === '' ? 0 : 1) +
    (entry.factors.length === 0 ? 0 : 1) +
    (entry.note.trim() === '' ? 0 : 1);

  const efficiencyUnavailable =
    entry.latency.trim() === '' && entry.awakenings.trim() === '';

  return (
    <>
      <DetailsTrigger
        title={t('sleep.details')}
        summary={t('sleep.detailsSummary')}
        badge={
          filledCount > 0 ? t('sleep.detailsFilled', { n: filledCount }) : null
        }
        hint={efficiencyUnavailable ? t('sleep.detailsEfficiencyHint') : null}
        open={open}
        onOpen={() => setOpen(true)}
      />

      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title={t('sleep.details')}
        description={t('sleep.detailsSummary')}
        footer={
          // `type="button"`: these fields live inside the page's `<form>`, and
          // a bare button in a form submits it — Done would have saved the
          // night instead of closing the panel.
          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="h-14 w-full rounded-2xl text-base"
          >
            {t('sleep.detailsDone')}
          </Button>
        }
      >
        <SleepDetailsFields entry={entry} />
      </ResponsiveModal>
    </>
  );
}

/**
 * The one closed card the panel opens from.
 *
 * A plain button rather than a `forwardRef` trigger: `ResponsiveModal` is
 * controlled, so nothing needs to be merged onto this element by Radix and
 * there is no ref to drop.
 *
 * **The trailing mark is a panel, not a chevron.** It was a `ChevronDown` that
 * rotated on open, and that is a broken promise: a chevron pointing down at a
 * card says the card is about to grow and reveal what is under it, and what
 * actually happens is that a sheet or a dialog covers the page. The owner read
 * the signal correctly and the signal was wrong. The behaviour is right — an
 * inline `Collapsible` here grew the column by ~400px and pushed the save
 * button down the page while the reader was reaching for it, which is the
 * defect `4d0b2cd` and the move to `ResponsiveModal` fixed — so the SIGNAL is
 * what changes. `PanelBottomOpen` draws a page with a panel rising over its
 * lower edge, which is what a reader below `lg` literally gets; at `lg` the
 * same panel is centred instead, and "a surface comes up over this page" is
 * still the true statement. `aria-haspopup="dialog"` says the same thing to a
 * reader who is not looking at it.
 *
 * The mark also sits inside its own hairline circle rather than floating as a
 * bare glyph. Among four rounded cards of near-identical tone, a 16px stroke
 * with nothing around it reads as punctuation; a bordered 36px disc reads as
 * the thing you press — and it is the only place on this card where a control
 * boundary is drawn, so it also answers "where do I tap" on the one card whose
 * whole problem is being found.
 *
 * Nothing rotates any more. The open panel dims and covers this card, so an
 * animation on it plays to nobody; `aria-expanded` still carries the state for
 * assistive technology, which is where it was ever being read.
 */
function DetailsTrigger({
  title,
  summary,
  badge,
  hint,
  open,
  onOpen,
}: {
  title: string;
  summary: string;
  /** How many of the fields inside already have a value. */
  badge: string | null;
  /** Why opening this matters, while it still does. */
  hint: string | null;
  open: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      // `haspopup` as well as `expanded`: what opens is a dialog now, not a
      // region below the button, and a reader told only "expanded" would go
      // looking for content that is not there.
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onOpen}
      className={cn(
        'group w-full rounded-3xl border bg-card px-5 py-4 text-left shadow',
        'transition-colors duration-200 motion-reduce:transition-none hover:bg-muted active:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <span className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            {/* A landmark, not decoration: this card's whole problem is being
                FOUND, and among four rounded cards of near-identical tone it is
                the only one with a glyph in its title. Sliders because what is
                behind it is a set of optional adjustments to a night already
                described — the chevron beside it says open/closed, and this says
                what opens. */}
            <SlidersHorizontal
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
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

        <span
          aria-hidden
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground',
            'transition-colors duration-200 motion-reduce:transition-none',
            'group-hover:border-primary/40 group-hover:text-foreground'
          )}
        >
          <PanelBottomOpen className="size-4" />
        </span>
      </span>

      {hint ? (
        <span className="mt-2 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </button>
  );
}
