'use client';

import { Button, Progress } from '@byte-of-me/ui';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  rebuildLinkGraph,
  rebuildSearchIndex,
  scanStaleNoteLinks,
} from '@/entities/note';
import {
  type BatchJobState,
  useBatchJob,
} from '@/features/dashboard/workspace-settings/lib/use-batch-job';

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
 */
export function MaintenancePanel() {
  const t = useTranslations('dashboard.space.settings.maintenance');

  const linkGraph = useBatchJob(rebuildLinkGraph);
  const searchIndex = useBatchJob(rebuildSearchIndex);
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
    </div>
  );
}

function JobCard<Extra>({
  title,
  description,
  state,
  onStart,
  onCancel,
  resultLabel,
  children,
}: {
  title: string;
  description: string;
  state: BatchJobState<Extra>;
  onStart: () => void;
  onCancel: () => void;
  resultLabel: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations('dashboard.space.settings.maintenance');
  const isRunning = state.status === 'running';

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
            onClick={onStart}
          >
            {t('run')}
          </Button>
        )}
      </div>

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
