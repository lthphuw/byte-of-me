'use client';

import { useState } from 'react';
import { Button, Progress } from '@byte-of-me/ui';
import { Loader2, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  rebuildLinkGraph,
  rebuildSearchIndex,
  scanStaleNoteLinks,
  stripNotePresentation,
} from '@/entities/note';
import {
  type BatchJobState,
  useBatchJob,
} from '@/features/notes/workspace-settings/lib/use-batch-job';

/**
 * Whole-vault jobs, each with a real progress bar and a cancel.
 *
 * ## What is deliberately NOT here
 *
 * There is no "reformat every note". Notes are stored as Tiptap documents, not
 * as markdown — markdown is a view of them — so a vault-wide reformat would
 * mean pushing every document through `JSON → markdown → JSON`. That round trip
 * DESTROYS everything markdown cannot express: captioned images, image rows,
 * citations, reference lists. And it would buy nothing, because the editor
 * already produces canonical JSON. The markdown clean-up button in the note
 * editor is the useful version of that idea, and it operates on source text the
 * author pasted in, which is the only text that needs it.
 *
 * The stale-link job is a REPORT rather than a fix, for a related reason. A
 * link's label can differ from its target's title because the target was
 * renamed, or because the author wrote their own words on purpose. Nothing
 * stored distinguishes the two. Renaming can fix labels automatically because
 * there the old title is known; a retrospective sweep does not know it, so it
 * lists what it found and stops.
 *
 * ## The one job that is not a repair
 *
 * `stripNotePresentation` EDITS documents. The other three recompute derived
 * data or only read, so the worst they can do is write back what was already
 * there; that one removes marks, and it cannot tell colour the author applied
 * from colour a paste brought in — after the fact they are the same mark with
 * the same attribute. It is therefore last on the panel, carries a standing
 * warning, and asks a second time before it starts.
 */
export function MaintenancePanel() {
  const t = useTranslations('dashboard.space.settings.maintenance');

  const linkGraph = useBatchJob(rebuildLinkGraph);
  const searchIndex = useBatchJob(rebuildSearchIndex);
  const pastedFormatting = useBatchJob(stripNotePresentation);
  const staleLinks = useBatchJob(scanStaleNoteLinks, {
    collect: (batch) => batch.stale,
  });

  return (
    <div className="space-y-4 py-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('intro')}
      </p>

      <JobCard
        title={t('jobs.staleLinks.title')}
        description={t('jobs.staleLinks.description')}
        state={staleLinks.state}
        onStart={staleLinks.start}
        onCancel={staleLinks.cancel}
        resultLabel={t('jobs.staleLinks.result', {
          count: staleLinks.state.collected.length,
        })}
      >
        {staleLinks.state.collected.length > 0 && (
          <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto rounded-md border bg-muted/30 p-2">
            {staleLinks.state.collected.map((row, index) => (
              <li
                key={`${row.sourceId}-${row.targetId}-${index}`}
                className="text-xs leading-relaxed"
              >
                <span className="font-medium">{row.sourceTitle}</span>
                <span className="text-muted-foreground">
                  {' '}
                  — {t('jobs.staleLinks.row', {
                    label: row.label,
                    title: row.targetTitle,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </JobCard>

      <JobCard
        title={t('jobs.linkGraph.title')}
        description={t('jobs.linkGraph.description')}
        state={linkGraph.state}
        onStart={linkGraph.start}
        onCancel={linkGraph.cancel}
        resultLabel={t('jobs.linkGraph.result', {
          count: linkGraph.state.changed,
        })}
      />

      <JobCard
        title={t('jobs.searchIndex.title')}
        description={t('jobs.searchIndex.description')}
        state={searchIndex.state}
        onStart={searchIndex.start}
        onCancel={searchIndex.cancel}
        resultLabel={t('jobs.searchIndex.result', {
          count: searchIndex.state.changed,
        })}
      />

      {/* Last, and the only card carrying a warning. It is the one job here
          that EDITS documents rather than recomputing something derived from
          them, so it does not belong above two jobs that cannot lose anything —
          and it asks twice before it starts. */}
      <JobCard
        title={t('jobs.pastedFormatting.title')}
        description={t('jobs.pastedFormatting.description')}
        warning={t('jobs.pastedFormatting.warning')}
        state={pastedFormatting.state}
        onStart={pastedFormatting.start}
        onCancel={pastedFormatting.cancel}
        resultLabel={t('jobs.pastedFormatting.result', {
          count: pastedFormatting.state.changed,
          examined: pastedFormatting.state.processed,
        })}
      />
    </div>
  );
}

function JobCard<Extra>({
  title,
  description,
  warning,
  state,
  onStart,
  onCancel,
  resultLabel,
  children,
}: {
  title: string;
  description: string;
  /**
   * What this job destroys, for a job that destroys something. Shown from the
   * moment the card renders — never revealed by the click it is warning about —
   * and its presence is also what makes Run a two-step control below.
   */
  warning?: string;
  state: BatchJobState<Extra>;
  onStart: () => void;
  onCancel: () => void;
  resultLabel: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations('dashboard.space.settings.maintenance');
  const isRunning = state.status === 'running';

  /**
   * A second press, for a job with a warning.
   *
   * The same shape the dialog's close guard uses — an inline confirm rather
   * than a modal, because a modal on top of a modal means two focus traps
   * arguing over Escape. Jobs without a warning are unaffected: they start on
   * the first press exactly as they always did.
   */
  const [isConfirming, setIsConfirming] = useState(false);

  const handleStart = () => {
    if (warning && !isConfirming) {
      setIsConfirming(true);
      return;
    }
    setIsConfirming(false);
    onStart();
  };

  // Guarded against a zero denominator rather than letting it be NaN: the very
  // first render of a run has `total: 0`, because the count arrives WITH the
  // first batch rather than before it.
  const percent =
    state.total > 0
      ? Math.min(100, Math.round((state.processed / state.total) * 100))
      : 0;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium leading-none">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        {isRunning ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={onCancel}
          >
            {t('cancel')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={handleStart}
          >
            {t('run')}
          </Button>
        )}
      </div>

      {/* The icon is not decoration: the palette is achromatic by design
          (AGENTS §14), so the amber wash cannot be the only thing marking this
          as a caution. */}
      {warning && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {warning}
        </p>
      )}

      {isConfirming && !isRunning && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsConfirming(false)}
          >
            {t('confirmDismiss')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleStart}
          >
            {t('confirmRun')}
          </Button>
        </div>
      )}

      {/* The progress region is announced as a unit rather than as a stream of
          numbers: `aria-live="polite"` on a counter that ticks 25 rows at a
          time would talk over everything else on the page. */}
      {isRunning && (
        <div className="mt-3 space-y-1.5" aria-busy>
          <Progress value={percent} />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {t('progress', {
              processed: state.processed,
              total: Math.max(state.total, state.processed),
            })}
          </p>
        </div>
      )}

      {state.status === 'done' && (
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {resultLabel}
        </p>
      )}

      {/* Cancelled is reported as its own outcome, not as success or failure:
          the batches that already ran DID commit, and saying "done" would
          overstate what happened while saying nothing would look like a bug. */}
      {state.status === 'cancelled' && (
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {t('cancelled', { processed: state.processed })}
        </p>
      )}

      {state.status === 'error' && (
        <p className="mt-3 text-xs text-destructive" aria-live="polite">
          {t('failed')}
          {state.errorMsg ? ` — ${state.errorMsg}` : ''}
        </p>
      )}

      {children}
    </div>
  );
}
