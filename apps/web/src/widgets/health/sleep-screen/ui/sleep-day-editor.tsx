'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { SleepLogRow } from '@/entities/sleep-log';
import {
  type CalendarNight,
  SleepMonthCalendar,
} from '@/features/health/sleep-charts';
import { buildDayDefaults, SleepEntryForm } from '@/features/health/sleep-entry';

/** One logged night, as the calendar needs it. Computed on the server — the
 *  statistics module stays out of the browser bundle, which is the same reason
 *  the summary is passed in rather than derived here. */
export interface LoggedNight {
  /** `YYYY-MM-DD`. */
  localDate: string;
  /** Minutes asleep, through `computeNight` — latency and awakenings taken
   *  off, exactly like every other duration in this module. */
  totalSleepMin: number;
  /** 1–5, or null when the night was never rated. */
  quality: number | null;
}

/**
 * The selectable month, and the form for whichever night is selected.
 *
 * The one client component on this screen that owns state, and it owns exactly
 * one thing: which day is being edited. Everything it needs to answer that is
 * already here — the rows for the visible month came down to draw the
 * calendar, so a tap redraws the form with no round trip. That is the whole
 * argument for keeping selection in React rather than in the URL beside the
 * month: a day is chosen dozens of times in a sitting and a month a handful of
 * times, and the fast one should not be a navigation.
 *
 * `key={selectedKey}` on the form is the reset. Every field in it is seeded
 * from `defaults` at mount, so remounting is how a different night gets a
 * different form — and carrying half of the 9th into the 14th, which an effect
 * syncing props into state would do at least once, is a worse failure than a
 * cheap remount.
 *
 * `aside` and `children` are server-rendered nodes passed straight through.
 * They are the statistics and the charts, neither of which is interactive, and
 * routing them through here as props keeps them off the client bundle.
 */
export function SleepDayEditor({
  nights,
  rows,
  monthStartKey,
  todayKey,
  initialSelectedKey,
  timeZone,
  targetMin,
  nowMin,
  prevMonthKey,
  nextMonthKey,
  aside,
  children,
}: {
  nights: LoggedNight[];
  /** Every row the screen read — the visible month AND the recent fortnight.
   *  The form's defaults need both: the day being edited, and the fortnight
   *  the median bedtime is taken from. */
  rows: SleepLogRow[];
  monthStartKey: string;
  todayKey: string;
  /** Where selection starts: today when the current month is on screen, the
   *  last day of the month otherwise. Resolved on the server so the first
   *  client render agrees with the markup. */
  initialSelectedKey: string;
  timeZone: string;
  targetMin: number;
  /** Minutes past local midnight, rounded to five, from `roundedNowMin`. */
  nowMin: number;
  prevMonthKey: string;
  nextMonthKey: string | null;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = useTranslations('dashboard.health');
  const locale = useLocale();
  const [selectedKey, setSelectedKey] = useState(initialSelectedKey);

  const calendarNights: CalendarNight[] = nights.map((night) => ({
    localDate: night.localDate,
    value: night.totalSleepMin,
    // Mood is what the calendar draws now, and no mood value is on hand yet
    // (a later task carries it down from the day entry). Null renders the
    // glyph-less mark the calendar already supports for an unrated night.
    quality: null,
  }));

  const defaults = buildDayDefaults({
    rows,
    dayKey: selectedKey,
    todayKey,
    timeZone,
    targetMin,
    nowMin,
  });

  // `timeZone: 'UTC'` is not a detail to tidy away: a `localDate` key is UTC
  // midnight standing for a calendar day, so formatting it in the reader's
  // zone would render the 22nd as the 21st for anyone west of Greenwich.
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${selectedKey}T00:00:00.000Z`));

  // The date and the "today" flag are two facts, not one sentence. Glued
  // together with an em dash the word read as part of the date's name; as a
  // separate chip beside it, it reads as what it is.
  const heading = t('sleep.nightOf', { date: dateLabel });
  const headingBadge = selectedKey === todayKey ? t('sleep.today') : undefined;

  return (
    <SleepEntryForm
      key={selectedKey}
      defaults={defaults}
      targetMin={targetMin}
      heading={heading}
      headingBadge={headingBadge}
      lead={
        <SleepMonthCalendar
          nights={calendarNights}
          monthStartKey={monthStartKey}
          todayKey={todayKey}
          targetMin={targetMin}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          prevMonthKey={prevMonthKey}
          nextMonthKey={nextMonthKey}
        />
      }
      aside={aside}
    >
      {children}
    </SleepEntryForm>
  );
}
