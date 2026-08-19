/**
 * What this spec defends: nobody is ever one keystroke away from closing this
 * dialog — and killing a whole-vault job with it — without having been warned
 * about the job that is actually running.
 *
 * Closing unmounts `MaintenancePanel`, and that unmount sets `useBatchJob`'s
 * `cancelledRef`, so the close guard answers the first Escape with a banner
 * instead of a close. The flag recording "they have been warned" is about ONE
 * run, though, and it used to outlive it: the banner was drawn on
 * `hasRunningJob && closeWarned` while the guard consumed `closeWarned` alone,
 * so a job ending took the banner off screen and left the flag armed. The next
 * job then died to a single Escape whose warning was never shown. That is the
 * sequence the first test walks.
 *
 * The job is a real one, driven through the panel's own Run button, with
 * `scanStaleNoteLinks` running against a faked Prisma delegate whose page read
 * this spec resolves by hand (never `mock.module()`; `spyOn` does not work on a
 * Prisma 7 delegate). Holding that read open is what keeps a job genuinely
 * mid-run while the keystrokes happen — the same state the author is in.
 */
import { useState } from 'react';
import { prisma } from '@byte-of-me/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it — the
// same exemption `i18n-parity.spec.ts` takes. The real strings rather than a
// hand-written stand-in, because the banner's wording is how this spec
// identifies it and a local copy would drift from what the author reads.
// eslint-disable-next-line import-alias/import-alias
import messages from '../../../../../messages/en.json';

import { WorkspaceSettingsDialog } from './workspace-settings-dialog';

/** The opening words of the banner, as `en.json` writes them. */
const WARNING = 'A maintenance job is still running';

/**
 * Resolves the batch read the running job is waiting on.
 *
 * An empty page is the job's own "nothing left" answer: `scanStaleNoteLinks`
 * returns `nextCursor: null` for it, which is the only way `useBatchJob`'s loop
 * ends in `done`. So calling this is exactly "the job finished".
 */
let finishBatch: (rows: unknown[]) => void = () => {};

const noteFindMany = mock(
  () =>
    new Promise<unknown[]>((resolve) => {
      finishBatch = resolve;
    })
);
const noteCount = mock(() => Promise.resolve(0));

/**
 * Applied per test rather than at module scope: `prisma.note` is one shared
 * object for the whole `bun test` process, and a fake left standing is a
 * failure in whichever spec file happens to run next.
 */
beforeEach(() => {
  noteFindMany.mockClear();
  noteCount.mockClear();
  Object.defineProperty(prisma, 'note', {
    value: { findMany: noteFindMany, count: noteCount },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
});

/**
 * `open` is held in state and the setter handed to the dialog — the shape the
 * workspace shell uses. Pinned to a literal `true`, a dialog that asks to close
 * stays on screen anyway and every assertion below would pass against the bug.
 */
function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onOpenChange = mock((_open: boolean) => {});

  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <WorkspaceSettingsDialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          setOpen(next);
        }}
      />
    );
  }

  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <Harness />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  return { onOpenChange };
}

/**
 * Starts the stale-link job — the first card, and the only one whose Run needs
 * no second press of its own (`pastedFormatting` carries a confirm step).
 *
 * No tab click first: the maintenance panel is `forceMount`ed, which is what
 * stops a glance at another tab from cancelling a running job.
 */
const runFirstJob = () =>
  fireEvent.click(screen.getAllByRole('button', { name: 'Run' })[0]);

const pressEscape = () =>
  fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

const banner = () => screen.queryByRole('alert');

/** The banner is on screen, and it is the close warning. */
function expectWarned() {
  const alert = banner();
  expect(alert).toBeTruthy();
  expect(alert?.textContent).toContain(WARNING);
}

/** Waits for the job loop to reach the page read this spec holds open. */
const untilBatchRequested = (times: number) =>
  waitFor(() => {
    expect(noteFindMany).toHaveBeenCalledTimes(times);
  });

describe('WorkspaceSettingsDialog close guard', () => {
  test('warns again for a second job, having been warned about the first', async () => {
    const { onOpenChange } = renderDialog();

    runFirstJob();
    await untilBatchRequested(1);

    pressEscape();
    expectWarned();
    expect(onOpenChange).not.toHaveBeenCalled();

    // The job ends while its warning is still on screen — the window the flag
    // used to survive.
    await act(async () => {
      finishBatch([]);
    });
    expect(banner()).toBeNull();

    runFirstJob();
    await untilBatchRequested(2);

    // The keystroke that used to close the dialog, and kill this job, against
    // a warning that had never been shown for it.
    pressEscape();
    expectWarned();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  test('a second Escape during the same job still closes', async () => {
    const { onOpenChange } = renderDialog();

    runFirstJob();
    await untilBatchRequested(1);

    pressEscape();
    expectWarned();

    // The guard costs one keystroke, not the ability to leave. A warning that
    // could never be got past would be its own bug.
    pressEscape();
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
