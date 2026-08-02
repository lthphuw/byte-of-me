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

import { noteKeys, searchNotes } from '@/entities/note';

const SEARCH_DEBOUNCE_MS = 300;

interface NoteSearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (noteId: string) => void;
}

export function NoteSearchPalette({
  open,
  onOpenChange,
  onSelect,
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
        placeholder={t('search.placeholder')}
      />
      <CommandList>
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
                  onSelect(hit.id);
                  onOpenChange(false);
                }}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{hit.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {hit.snippet}
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
