'use client';

import { useState } from 'react';
import { Button, Input } from '@byte-of-me/ui';
import { ChevronRight, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { type NoteProperties, parseNoteProperties } from '@/entities/note';
import { coercePropertyValue } from '@/features/dashboard/note-properties/lib/coerce-property-value';
import { useNoteProperties } from '@/features/dashboard/note-properties/lib/use-note-properties';
import { cn } from '@/shared/lib/utils';

/**
 * Preset status TOKENS are stored in English on purpose: grouped views and a
 * future graph filter compare stored values, and a value that changes with
 * the UI locale would split one status into two groups. Only the chip LABELS
 * are translated.
 */
const STATUS_PRESETS = ['draft', 'active', 'done'] as const;

/**
 * The note's structured "frontmatter": status + free key→value rows, shown as
 * a collapsed disclosure under the title (Obsidian's Properties, not a YAML
 * text block — see the design spec). Self-contained: reads and writes through
 * `useNoteProperties`, so the widget only hands it a `noteId`.
 */
export function NotePropertiesPanel({ noteId }: { noteId: string }) {
  const t = useTranslations('dashboard.note.properties');
  const { note, save, allLabels, saveLabels } = useNoteProperties(noteId);
  const [open, setOpen] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const [draftLabel, setDraftLabel] = useState('');

  // Nothing to render until the note is here — the editor around this panel
  // already shows its own loading state for the same query.
  //
  // Re-verified rather than assumed, because "some other component handles it"
  // is exactly the claim that rots: `NoteEditor` renders `propertiesSlot` only
  // AFTER its own `isError` / `isPending || !isSeeded` guards have returned,
  // and it reads `noteKeys.detail(noteId)` — the same key `useNoteProperties`
  // reads. So this panel cannot mount while that query is pending or failed,
  // and adding a placeholder here would be dead code that never paints. If the
  // slot ever moves outside those guards, this branch needs a skeleton band
  // the height of the collapsed disclosure, or the editor's title will jump
  // when the panel appears.
  if (!note) return null;

  const properties = parseNoteProperties(note.properties);
  const entries = Object.entries(properties);

  // The status a click has ALREADY chosen, before the round trip lands.
  //
  // Without it the preset chips gave no feedback whatsoever: `note.status`
  // only changes once `updateNote` returns, so clicking "Done" left every chip
  // exactly as it was for the length of the request and the author's honest
  // reading was that the click had missed. `save.variables` is the input of
  // the mutation currently in flight, so this is the value that is about to be
  // true — not an optimistic write to the cache, which would have to be rolled
  // back on failure.
  const pendingStatus = save.isPending ? save.variables.status : undefined;
  const shownStatus = pendingStatus ?? note.status;

  const commitStatus = (raw: string) => {
    const next = raw.trim();
    if (!next || next === note.status) return;
    save.mutate({ status: next });
  };

  const commitProperties = (next: NoteProperties) => {
    save.mutate({ properties: next });
  };

  const addDraft = () => {
    const key = draftKey.trim();
    if (!key) return;
    commitProperties({ ...properties, [key]: coercePropertyValue(draftValue) });
    setDraftKey('');
    setDraftValue('');
  };

  const labelNames = note.labels.map((label) => label.name);

  // Labels the in-flight `setNoteLabels` is ADDING — names it was handed that
  // the note does not carry yet.
  //
  // Typing a label and pressing Enter used to clear the input and then show
  // nothing at all until the round trip landed, so on anything slower than
  // localhost the label read as having been swallowed. A removal hands back a
  // SHORTER list, so this is empty for one and the chips simply stay put until
  // the server agrees — which is the correct reading of a delete in flight.
  //
  // Read off `saveLabels.variables` rather than written into the query cache:
  // an optimistic cache write would have to be rolled back on failure, and the
  // detail key it would have to write into is the one `useNoteEditorAutosave`
  // reseeds the editor buffer from.
  const pendingLabelNames = saveLabels.isPending
    ? saveLabels.variables.filter((name) => !labelNames.includes(name))
    : [];

  const addLabel = () => {
    const name = draftLabel.trim();
    if (!name || labelNames.includes(name)) {
      setDraftLabel('');
      return;
    }
    saveLabels.mutate([...labelNames, name]);
    setDraftLabel('');
  };

  return (
    <div className="shrink-0 border-b px-4 md:px-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform', open && 'rotate-90')}
        />
        {t('title')}
        {entries.length > 0 && (
          <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
            {entries.length}
          </span>
        )}
      </button>

      {open && (
        // `aria-busy` while either write is in flight. The panel commits on
        // blur and on Enter, with no submit button and no toast on success, so
        // without this there is no signal at all — visual or announced — that
        // the value the author just typed is still on its way to the server.
        <div
          className="flex flex-col gap-2 pb-3 text-sm"
          aria-busy={save.isPending || saveLabels.isPending ? true : undefined}
        >
          {/* Status: free text + quick-pick chips. */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="w-28 shrink-0 text-xs text-muted-foreground">
              {t('status')}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <Input
                // Uncontrolled, reseeded whenever the server value changes:
                // commit happens on blur/Enter, and a keyed defaultValue means
                // no sync effect is needed to reflect a landed save.
                key={note.status}
                defaultValue={note.status}
                aria-label={t('status')}
                placeholder={t('statusPlaceholder')}
                maxLength={50}
                className="h-7 w-36 text-xs"
                onBlur={(event) => commitStatus(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitStatus(event.currentTarget.value);
                  }
                }}
              />
              {STATUS_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  // `shownStatus`, not `note.status`: the chip has to light up
                  // on the click, not when the server answers. See where it is
                  // computed.
                  variant={shownStatus === preset ? 'secondary' : 'ghost'}
                  className="h-6 px-2 text-xs"
                  onClick={() => commitStatus(preset)}
                >
                  {t(`presets.${preset}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* Labels: chips + a datalist-backed adder. Commit replaces the
              whole set — see `setNoteLabels`. */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="w-28 shrink-0 text-xs text-muted-foreground">
              {t('labels')}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {note.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {label.name}
                  <button
                    type="button"
                    aria-label={t('removeLabel', { name: label.name })}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      saveLabels.mutate(
                        labelNames.filter((name) => name !== label.name)
                      )
                    }
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}

              {/* A label that has been submitted but not yet acknowledged.
                  Drawn as the chip it is about to become — same box, same
                  text — rather than as a bare `Skeleton`, because the name is
                  already known: a grey bar would say less than the word does,
                  and the chip would then have to change size when it lands.
                  `animate-pulse` and no remove button are what mark it as not
                  yet real; per AGENTS §14 loading feedback keeps moving under
                  reduced motion on purpose. */}
              {pendingLabelNames.map((name) => (
                <span
                  key={`pending:${name}`}
                  className="inline-flex animate-pulse items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {name}
                </span>
              ))}

              <Input
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                aria-label={t('labels')}
                placeholder={t('labelsPlaceholder')}
                maxLength={40}
                list="note-label-suggestions"
                className="h-7 w-32 text-xs"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault();
                    addLabel();
                  }
                }}
                onBlur={addLabel}
              />
              <datalist id="note-label-suggestions">
                {allLabels
                  .filter((label) => !labelNames.includes(label.name))
                  .map((label) => (
                    <option key={label.id} value={label.name} />
                  ))}
              </datalist>
            </div>
          </div>

          {/* Existing key→value rows. */}
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
            >
              <span
                className="w-28 shrink-0 truncate text-xs text-muted-foreground"
                title={key}
              >
                {key}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Input
                  key={`${key}:${String(value)}`}
                  defaultValue={String(value)}
                  aria-label={t('valueFor', { key })}
                  maxLength={500}
                  className="h-7 flex-1 text-xs"
                  onBlur={(event) => {
                    const next = coercePropertyValue(event.target.value);
                    if (next === value) return;
                    commitProperties({ ...properties, [key]: next });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  aria-label={t('remove', { key })}
                  onClick={() => {
                    const { [key]: _removed, ...rest } = properties;
                    commitProperties(rest);
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {/* The add row. Committed by the button or Enter in the value
              field; an empty key is a no-op, not an error state. */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <Input
              value={draftKey}
              onChange={(event) => setDraftKey(event.target.value)}
              aria-label={t('key')}
              placeholder={t('keyPlaceholder')}
              maxLength={60}
              className="h-7 w-28 shrink-0 text-xs"
            />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Input
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                aria-label={t('value')}
                placeholder={t('valuePlaceholder')}
                maxLength={500}
                className="h-7 flex-1 text-xs"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addDraft();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                aria-label={t('add')}
                disabled={draftKey.trim() === ''}
                onClick={addDraft}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
