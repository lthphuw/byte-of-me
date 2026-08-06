'use client';

import { useState } from 'react';
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  useDebounce,
} from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { noteKeys, type NoteSearchHit, searchNotes } from '@/entities/note';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * `searchNotes` marks FTS matches with `<<`/`>>` (plain-text markers chosen
 * server-side precisely so nothing here parses HTML). Split on them and wrap
 * the odd segments in <mark>.
 */
function renderSnippet(snippet: string): React.ReactNode {
  if (!snippet.includes('<<')) return snippet;
  return snippet.split(/<<|>>/).map((segment, index) =>
    index % 2 === 1 ? (
      // `index` as the key: the segments ARE positional by construction —
      // `split` on the highlight delimiters, so segment N is always the same
      // piece of the same snippet. (This used to carry an
      // `eslint-disable-next-line react/no-array-index-key`; the rule is not
      // enabled here, so the directive was dead, but the reasoning is not.)
      <mark key={index} className="rounded-sm bg-primary/25 text-inherit">
        {segment}
      </mark>
    ) : (
      segment
    )
  );
}

/** Case-insensitive first-occurrence highlight for the title row. */
function renderTitle(title: string, term: string): React.ReactNode {
  const trimmed = term.trim();
  if (!trimmed) return title;
  const at = title.toLowerCase().indexOf(trimmed.toLowerCase());
  if (at === -1) return title;
  return (
    <>
      {title.slice(0, at)}
      <mark className="rounded-sm bg-primary/25 text-inherit">
        {title.slice(at, at + trimmed.length)}
      </mark>
      {title.slice(at + trimmed.length)}
    </>
  );
}

/** A quick action offered above the results while the query is empty. */
export interface PaletteAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

interface NoteSearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The chosen note. The full hit follows the id because the link picker
   * needs the title to use as the link's text — the palette is the same
   * component in both roles, opened with a different placeholder.
   */
  onSelect: (noteId: string, hit: NoteSearchHit) => void;
  /** Overrides the search placeholder — see `onSelect`. */
  placeholder?: string;
  /**
   * Launch-point commands (new note, cheat sheet, …). Only the SEARCH role
   * passes these — never the `[[` link picker, where "New note" would insert
   * nothing and confuse the flow. Hidden the moment the author types: typing
   * means they are searching, and actions are not search results.
   */
  actions?: PaletteAction[];
}

export function NoteSearchPalette({
  open,
  onOpenChange,
  onSelect,
  placeholder,
  actions,
}: NoteSearchPaletteProps) {
  const t = useTranslations('dashboard.note');
  const [term, setTerm] = useState('');
  // `useDebounce` returns a 3-tuple ([value, cancel, { cancel, flush }]);
  // only the debounced value itself is needed here.
  const [debouncedTerm] = useDebounce(term, SEARCH_DEBOUNCE_MS);

  const { data, isPending, isError } = useQuery({
    queryKey: noteKeys.search(debouncedTerm, 1),
    queryFn: async () => {
      const res = await searchNotes({
        query: debouncedTerm,
        includeArchived: false,
        page: 1,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: open,
  });

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      // cmdk filters client-side by default, scoring each `CommandItem`'s
      // `value` against the typed text. Results here are already filtered
      // server-side by `searchNotes`, and `value` below is `hit.id` (needed
      // as a stable, unique key), not the matched title/snippet text — so
      // cmdk's own filter would score every item against text it was never
      // meant to match and hide them all. Disabling it trusts the server's
      // `contains` filter as the sole source of truth for what matches.
      shouldFilter={false}
    >
      <CommandInput
        value={term}
        onValueChange={setTerm}
        placeholder={placeholder ?? t('search.placeholder')}
      />
      <CommandList>
        {actions && actions.length > 0 && term === '' && (
          <CommandGroup heading={t('search.actionsHeading')}>
            {actions.map((action) => (
              <CommandItem
                key={action.id}
                value={`action:${action.id}`}
                onSelect={() => {
                  // Close FIRST: an action may open its own dialog, and two
                  // stacked dialogs fight over focus and the Escape key.
                  onOpenChange(false);
                  action.onSelect();
                }}
              >
                {action.icon}
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {/* Deliberately NOT `CommandEmpty`: it holds a `useRef(true)` "first
            render" guard and returns null on its own mount no matter what
            `filtered.count` is — it only ever shows starting on a LATER
            render, once the cmdk store itself changes (which typing does,
            since `CommandInput` writes into it, but opening the dialog or
            reusing a warm TanStack cache entry on reopen does not). That
            made every one of the three copies below invisible on the exact
            renders they exist for: first open (still pending) rendered
            blank, and a reopen within the query's `staleTime` — cache warm,
            zero refetch, exactly one render — rendered a blank "no matches"
            with no explanation. `filtered.count` is also cmdk's OWN
            filtered-item bookkeeping, which is meaningless here anyway with
            `shouldFilter={false}` on the `Command` above: nothing is being
            filtered for it to count. Plain nodes keyed directly off the
            query flags render correctly on every render, including the
            first one and a cache-only reopen. */}
        {isPending && (
          <div className="py-6 text-center text-sm">{t('search.loading')}</div>
        )}
        {isError && (
          <div className="py-6 text-center text-sm text-destructive">
            {t('errors.load')}
          </div>
        )}
        {!isPending && !isError && data?.data.length === 0 && (
          <div className="py-6 text-center text-sm">{t('search.empty')}</div>
        )}
        {!isPending && !isError && data && data.data.length > 0 && (
          <CommandGroup>
            {data.data.map((hit) => (
              <CommandItem
                key={hit.id}
                value={hit.id}
                onSelect={() => {
                  onSelect(hit.id, hit);
                  onOpenChange(false);
                }}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">
                    {renderTitle(hit.title, debouncedTerm)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {renderSnippet(hit.snippet)}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
