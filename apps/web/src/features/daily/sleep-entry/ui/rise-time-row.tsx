'use client';

import { Input, Label } from '@byte-of-me/ui';
import { ArrowUpFromLine } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RISE_OFFSET_PRESETS } from '@/features/daily/sleep-entry/model/use-sleep-entry';
import { cn } from '@/shared/lib/utils';

/** `null` is the custom chip. An id, so the row carries it alongside the
 *  three numeric offsets in one list. */
const CUSTOM = 'custom';

/**
 * When you actually got out of bed — three offsets from the wake time and an
 * escape hatch, not a fourth clock and a second OS picker at 6am. `Same` is
 * the default and a REAL answer, which is what keeps efficiency computable.
 */
export function RiseTimeRow({
  offsetMin,
  onOffsetChange,
  customClock,
  onCustomClockChange,
  riseClock,
}: {
  offsetMin: number | null;
  onOffsetChange: (offsetMin: number | null) => void;
  customClock: string;
  onCustomClockChange: (clock: string) => void;
  /** The resolved clock, shown beside the label so an offset is never the
   *  only reading of the answer. */
  riseClock: string;
}) {
  const t = useTranslations('dashboard.daily');

  const presetLabels: Record<number, string> = {
    0: t('sleep.riseSame'),
    15: t('sleep.risePlus15'),
    30: t('sleep.risePlus30'),
  };

  const options = [
    ...RISE_OFFSET_PRESETS.map((preset) => ({
      id: String(preset),
      label: presetLabels[preset],
      offset: preset as number | null,
    })),
    { id: CUSTOM, label: t('sleep.riseCustom'), offset: null },
  ];

  const activeId = offsetMin === null ? CUSTOM : String(offsetMin);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span id="sleep-rise-label" className="flex items-center gap-1.5 text-sm font-medium">
          <ArrowUpFromLine
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          {t('sleep.rise')}
        </span>
        <span aria-live="polite" className="text-sm tabular-nums">
          {riseClock === '' ? t('sleep.riseUnset') : riseClock}
        </span>
      </div>

      <div
        role="group"
        aria-labelledby="sleep-rise-label"
        className="grid grid-cols-4 gap-2"
      >
        {options.map((option) => {
          const isActive = option.id === activeId;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onOffsetChange(option.offset)}
              className={cn(
                'flex min-h-11 items-center justify-center rounded-2xl border px-1 text-center',
                'text-xs tabular-nums leading-tight',
                'transition-colors duration-200 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isActive
                  ? 'border-primary bg-primary font-medium text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {offsetMin === null ? (
        <div className="space-y-1 pt-1">
          <Label htmlFor="sleep-rise-at" className="text-xs text-muted-foreground">
            {t('sleep.riseCustomLabel')}
          </Label>
          {/* `appearance-none` for the reason the two clocks above carry it:
              WebKit's intrinsic min-width, which `width:100%` cannot shrink. */}
          <Input
            id="sleep-rise-at"
            type="time"
            value={customClock}
            onChange={(event) => onCustomClockChange(event.target.value)}
            className="h-12 appearance-none rounded-2xl bg-background tabular-nums"
          />
        </div>
      ) : null}
    </div>
  );
}
