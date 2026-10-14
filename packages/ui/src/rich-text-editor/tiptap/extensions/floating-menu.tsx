'use client';

import {
  type ComponentProps,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Editor } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { FloatingMenu } from '@tiptap/react/menus';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../../../index';
import { cn } from '../../../lib/utils';
import type { EditorLabels } from '../editor-labels';

import { buildGroups, filterGroups } from './slash-menu-items';

type ShouldShowProps = Parameters<
  NonNullable<ComponentProps<typeof FloatingMenu>['shouldShow']>
>[0];

/**
 * Memoised: the host re-renders for outline, preview and raw-mode state, and each
 * one would rebuild ~20 cmdk items whether or not the menu is open. Safe to skip —
 * the props are the editor and the labels, and neither changes between those
 * renders; what shows is own state, set from `shouldShow`.
 */
export const TipTapFloatingMenu = memo(function TipTapFloatingMenu({
  editor,
  labels,
}: {
  editor: Editor;
  labels: EditorLabels;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const commandRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const groups = useMemo(() => buildGroups(labels), [labels]);

  // Filtered by the live query, never a delayed copy: `executeCommand` deletes
  // exactly what was typed, so Enter has to run the entry the list shows now.
  const filteredGroups = useMemo(
    () => filterGroups(groups, search),
    [groups, search]
  );

  const flatFilteredItems = useMemo(
    () => filteredGroups.flatMap((g) => g.items),
    [filteredGroups]
  );

  const executeCommand = useCallback(
    (commandFn: (editor: Editor) => void) => {
      if (!editor) return;

      try {
        const { from } = editor.state.selection;
        const slashCommandLength = search.length + 1;

        editor
          .chain()
          .focus()
          .deleteRange({
            from: Math.max(0, from - slashCommandLength),
            to: from,
          })
          .run();

        commandFn(editor);
      } finally {
        setIsOpen(false);
        setSearch('');
        setSelectedIndex(-1);
      }
    },
    [editor, search]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || !editor) return;

      const preventDefault = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };

      switch (e.key) {
        case 'ArrowDown':
          preventDefault();
          setSelectedIndex((prev) => {
            if (prev === -1) return 0;
            return prev < flatFilteredItems.length - 1 ? prev + 1 : 0;
          });
          break;

        case 'ArrowUp':
          preventDefault();
          setSelectedIndex((prev) => {
            if (prev === -1) return flatFilteredItems.length - 1;
            return prev > 0 ? prev - 1 : flatFilteredItems.length - 1;
          });
          break;

        case 'Enter': {
          preventDefault();
          const targetIndex = selectedIndex === -1 ? 0 : selectedIndex;
          if (flatFilteredItems[targetIndex]) {
            executeCommand(flatFilteredItems[targetIndex].command);
          }
          break;
        }

        case 'Escape':
          preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [isOpen, selectedIndex, flatFilteredItems, executeCommand, editor]
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom) return;

    const element = editor.view.dom;
    const handleEditorKeyDown = (e: Event) => handleKeyDown(e as KeyboardEvent);

    element.addEventListener('keydown', handleEditorKeyDown);

    return () => {
      element.removeEventListener('keydown', handleEditorKeyDown);
    };
  }, [handleKeyDown, editor]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [search]);

  const pluginKey = useMemo(() => new PluginKey('slashCommandMenu'), []);

  // `shouldShow` runs inside the plugin, not the render pass, so it reads the
  // latest state through a ref instead of a closure. That keeps the callback
  // itself referentially stable — see the note on the component below.
  const menuStateRef = useRef({ isOpen, search });
  menuStateRef.current = { isOpen, search };

  const shouldShow = useCallback(({ state }: ShouldShowProps) => {
    const { $from } = state.selection;
    const currentLineText = $from.parent.textBetween(
      0,
      $from.parentOffset,
      '\n',
      ' '
    );

    const isSlashCommand =
      currentLineText.startsWith('/') &&
      $from.parent.type.name !== 'codeBlock' &&
      $from.parentOffset === currentLineText.length;

    if (!isSlashCommand) {
      if (menuStateRef.current.isOpen) setIsOpen(false);
      return false;
    }

    const query = currentLineText.slice(1).trim();
    if (query !== menuStateRef.current.search) setSearch(query);
    if (!menuStateRef.current.isOpen) setIsOpen(true);
    return true;
  }, []);

  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.focus();
    }
  }, [selectedIndex]);

  return (
    <FloatingMenu
      editor={editor}
      // Both MUST keep a stable identity: `@tiptap/react/menus` dispatches a
      // transaction whenever either changes (the default `pluginKey` is rebuilt
      // every render) — which looped when each transaction re-rendered the host.
      pluginKey={pluginKey}
      shouldShow={shouldShow}
    >
      <Command
        ref={commandRef}
        className="z-50 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg"
      >
        <CommandList>
          <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
            {labels.noResults}
          </CommandEmpty>

          {filteredGroups.map((group, groupIndex) => (
            <CommandGroup
              key={`${group.group}-${groupIndex}`}
              heading={
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {group.group}
                </div>
              }
            >
              {group.items.map((item, itemIndex) => {
                const flatIndex =
                  filteredGroups
                    .slice(0, groupIndex)
                    .reduce((acc, g) => acc + g.items.length, 0) + itemIndex;

                return (
                  <CommandItem
                    key={`${group.group}-${item.title}-${itemIndex}`}
                    value={`${group.group}-${item.title}`}
                    onSelect={() => executeCommand(item.command)}
                    className={cn(
                      'gap-3 aria-selected:bg-accent/50',
                      flatIndex === selectedIndex ? 'bg-accent/50' : ''
                    )}
                    aria-selected={flatIndex === selectedIndex}
                    ref={(el) => {
                      itemRefs.current[flatIndex] = el;
                    }}
                    tabIndex={flatIndex === selectedIndex ? 0 : -1}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                    <kbd className="ml-auto flex h-5 items-center rounded bg-muted px-1.5 text-xs text-muted-foreground">
                      ↵
                    </kbd>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </FloatingMenu>
  );
});
