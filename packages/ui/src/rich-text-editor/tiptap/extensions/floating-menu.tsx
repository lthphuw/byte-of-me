'use client';

import React, {
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
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronRight,
  Code2,
  CodeSquare,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  TextQuote,
} from 'lucide-react';

import { useDebounce } from '../../../hooks/use-debounce';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  ScrollArea,
} from '../../../index';
import { cn } from '../../../lib/utils';
import type { EditorLabels } from '../editor-labels';

interface CommandItemType {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
  command: (editor: Editor) => void;
  group: string;
}

type CommandGroupType = {
  group: string;
  items: Omit<CommandItemType, 'group'>[];
};

/**
 * The slash menu's entries, built from the app's text rather than held as a
 * constant: every group name, title and description is a label (see
 * `EditorLabels`). `keywords` are search aliases that are never drawn, so they
 * stay as written.
 */
const buildGroups = (labels: EditorLabels): CommandGroupType[] => [
  {
    group: labels.basicBlocks,
    items: [
      {
        title: labels.text,
        description: labels.textDescription,
        icon: ChevronRight,
        keywords: 'paragraph text',
        command: (editor) => editor.chain().focus().clearNodes().run(),
      },
      {
        title: labels.heading1,
        description: labels.heading1Description,
        icon: Heading1,
        keywords: 'h1 title header',
        command: (editor) =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        title: labels.heading2,
        description: labels.heading2Description,
        icon: Heading2,
        keywords: 'h2 subtitle',
        command: (editor) =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        title: labels.heading3,
        description: labels.heading3Description,
        icon: Heading3,
        keywords: 'h3 subheader',
        command: (editor) =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        title: labels.bulletList,
        description: labels.bulletListDescription,
        icon: List,
        keywords: 'unordered ul bullets',
        command: (editor) => editor.chain().focus().toggleBulletList().run(),
      },
      {
        title: labels.numberedList,
        description: labels.numberedListDescription,
        icon: ListOrdered,
        keywords: 'numbered ol',
        command: (editor) => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        title: labels.codeBlock,
        description: labels.codeBlockDescription,
        icon: Code2,
        keywords: 'code snippet pre',
        command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        title: labels.image,
        // Picking more than one file in the dialog inserts them as a row, so
        // the one entry covers both shapes — see `image-placeholder.tsx`.
        description: labels.imageDescription,
        icon: ImageIcon,
        keywords: 'image picture photo row gallery side by side',
        command: (editor) =>
          editor.chain().focus().insertImagePlaceholder().run(),
      },
      {
        title: labels.horizontalRule,
        description: labels.horizontalRuleDescription,
        icon: Minus,
        keywords: 'horizontal rule divider',
        command: (editor) => editor.chain().focus().setHorizontalRule().run(),
      },
    ],
  },
  {
    group: labels.inline,
    items: [
      {
        title: labels.quote,
        description: labels.quoteDescription,
        icon: Quote,
        keywords: 'blockquote cite',
        command: (editor) => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        title: labels.code,
        description: labels.codeDescription,
        icon: CodeSquare,
        keywords: 'code inline',
        command: (editor) => editor.chain().focus().toggleCode().run(),
      },
      {
        title: labels.blockquote,
        description: labels.blockquoteDescription,
        icon: TextQuote,
        keywords: 'blockquote quote',
        command: (editor) => editor.chain().focus().toggleBlockquote().run(),
      },
    ],
  },
  {
    group: labels.alignment,
    items: [
      {
        title: labels.alignLeft,
        description: labels.alignLeftDescription,
        icon: AlignLeft,
        keywords: 'align left',
        command: (editor) => editor.chain().focus().setTextAlign('left').run(),
      },
      {
        title: labels.alignCenter,
        description: labels.alignCenterDescription,
        icon: AlignCenter,
        keywords: 'align center',
        command: (editor) =>
          editor.chain().focus().setTextAlign('center').run(),
      },
      {
        title: labels.alignRight,
        description: labels.alignRightDescription,
        icon: AlignRight,
        keywords: 'align right',
        command: (editor) => editor.chain().focus().setTextAlign('right').run(),
      },
    ],
  },
];

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
  const [debouncedSearch] = useDebounce(search, 300);
  const commandRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const groups = useMemo(() => buildGroups(labels), [labels]);

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.title
                .toLowerCase()
                .includes(debouncedSearch.toLowerCase()) ||
              item.description
                .toLowerCase()
                .includes(debouncedSearch.toLowerCase()) ||
              item.keywords
                .toLowerCase()
                .includes(debouncedSearch.toLowerCase())
          ),
        }))
        .filter((group) => group.items.length > 0),
    [groups, debouncedSearch]
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
      } catch (error) {
        console.error('Error executing command:', error);
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

  // Add new effect for resetting selectedIndex
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
      // tippyOptions={{
      //   placement: "bottom-start",
      //   interactive: true,
      //   appendTo: () => document.body,
      //   onHide: () => {
      //     setIsOpen(false);
      //     setSelectedIndex(-1);
      //   },
      // }}
    >
      <Command
        role="listbox"
        ref={commandRef}
        className="z-50 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg"
      >
        <ScrollArea className="max-h-[330px]">
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
                      role="option"
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
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
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
        </ScrollArea>
      </Command>
    </FloatingMenu>
  );
});
