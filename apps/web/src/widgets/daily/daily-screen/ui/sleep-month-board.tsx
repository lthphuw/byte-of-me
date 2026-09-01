'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { DayEntryCard } from './day-entry-card';

import type { DayEntryRow } from '@/entities/day-entry';
import type { SleepLogRow } from '@/entities/sleep-log';
import { DayModal, MOOD_ICON } from '@/features/daily/day-journal';
import {
  type CalendarNight,
  SleepMonthCalendar,
} from '@/features/daily/sleep-charts';
import { buildDayDefaults } from '@/features/daily/sleep-entry';

/** One logged night, as the calendar needs it. Computed on the server — the
 *  statistics module stays out of the browser bundle, which is the same
 *  reason the summary is passed in rather than derived here. */
export interface LoggedNight {
  /** `YYYY-MM-DD`. */
  localDate: string;
  /** Minutes asleep, through `computeNight`. `null` is a day with no sleep
   *  row — it can still be written up, which is why `DayEntry` exists. */
  totalSleepMin: number | null;
  /** 1–5 from `DayEntry`, not `SleepLog.quality`: the face on the calendar
   *  is how the DAY felt. */
  mood: number | null;
  /** Whether the day has a reflection or any photo. */
  hasEntry: boolean;
}

/**
 * Every way into the day sheet — the entry card for last night, the month for
 * any other day — and the sheet itself. One stateful client component: a day
 * opens dozens of times a sitting, and the fast one should not be a navigation.
 *
 * `key={openKey}` is the reset. Every field is seeded at mount, and carrying
 * half of the 9th into the 14th is worse than a cheap remount.
 */
export function SleepMonthBoard({
  nights,
  rows,
  dayEntries,
  monthStartKey,
  todayKey,
  timeZone,
  targetMin,
  lastNightMin,
  lastNightEstimated,
  nowMin,
  prevMonthKey,
  nextMonthKey,
}: {
  nights: LoggedNight[];
  rows: SleepLogRow[];
  dayEntries: DayEntryRow[];
  monthStartKey: string;
  todayKey: string;
  timeZone: string;
  targetMin: number;
  /** Minutes asleep on the night dated `todayKey`, or `null` if unlogged. */
  lastNightMin: number | null;
  lastNightEstimated: boolean;
  nowMin: number;
  prevMonthKey: string;
  nextMonthKey: string | null;
}) {
  const t = useTranslations('dashboard.daily');
  const locale = useLocale();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const moodLabels: Record<number, string> = {
    1: t('day.moodLevel1'),
    2: t('day.moodLevel2'),
    3: t('day.moodLevel3'),
    4: t('day.moodLevel4'),
    5: t('day.moodLevel5'),
  };

  const calendarNights: CalendarNight[] = nights.map((night) => ({
    localDate: night.localDate,
    value: night.totalSleepMin,
    hasEntry: night.hasEntry,
    mood:
      night.mood === null
        ? null
        : { icon: MOOD_ICON[night.mood], label: moodLabels[night.mood] },
  }));

  // `timeZone: 'UTC'` is not a detail to tidy away: a `localDate` key is UTC
  // midnight standing for a calendar day, so formatting it in the reader's
  // zone would render the 22nd as the 21st for anyone west of Greenwich.
  const dayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

  return (
    <>
      <DayEntryCard
        totalSleepMin={lastNightMin}
        estimated={lastNightEstimated}
        targetMin={targetMin}
        dateLabel={dayFormat.format(new Date(`${todayKey}T00:00:00.000Z`))}
        onOpen={() => setOpenKey(todayKey)}
      />

      <div className="min-w-0 rounded-3xl border bg-card p-5 shadow">
        <SleepMonthCalendar
          nights={calendarNights}
          monthStartKey={monthStartKey}
          todayKey={todayKey}
          targetMin={targetMin}
          onSelect={setOpenKey}
          prevMonthKey={prevMonthKey}
          nextMonthKey={nextMonthKey}
        />
      </div>

      {openKey === null ? null : (
        <DayModal
          key={openKey}
          open
          onOpenChange={(next) => setOpenKey(next ? openKey : null)}
          localDate={openKey}
          todayKey={todayKey}
          dateLabel={dayFormat.format(new Date(`${openKey}T00:00:00.000Z`))}
          entry={dayEntries.find((e) => e.localDate === openKey) ?? null}
          hasSleepLog={rows.some((row) => row.localDate === openKey)}
          sleepDefaults={buildDayDefaults({
            rows,
            dayKey: openKey,
            todayKey,
            timeZone,
            targetMin,
            nowMin,
          })}
          targetMin={targetMin}
        />
      )}
    </>
  );
}
