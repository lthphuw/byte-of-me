import type { Editor } from '@tiptap/core';
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
} from 'lucide-react';

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
 * The slash menu's entries, built from the app's text (every group, title and description
 * is a label). `keywords` are search aliases that are never drawn, so they stay as written.
 */
export const buildGroups = (labels: EditorLabels): CommandGroupType[] => [
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

/** The groups with only the entries whose title, description or keywords hold `query`. */
export function filterGroups(
  groups: CommandGroupType[],
  query: string
): CommandGroupType[] {
  const needle = query.toLowerCase();
  const matches = (item: CommandGroupType['items'][number]) =>
    [item.title, item.description, item.keywords].some((field) =>
      field.toLowerCase().includes(needle)
    );

  return groups
    .map((group) => ({ ...group, items: group.items.filter(matches) }))
    .filter((group) => group.items.length > 0);
}
