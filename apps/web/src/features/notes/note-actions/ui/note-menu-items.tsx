'use client';

import { Fragment } from 'react';

import {
  type NoteActionItem,
  type NoteActionsTarget,
  useNoteActionItems,
} from '@/features/notes/note-actions/lib/use-note-action-items';
import { cn } from '@/shared/lib/utils';

interface NoteMenuItemsProps extends NoteActionsTarget {
  /** Radix's item component for whichever surface is rendering. */
  Item: React.ComponentType<{
    disabled?: boolean;
    onSelect: () => void;
    className?: string;
    children: React.ReactNode;
  }>;
  /** That surface's separator. */
  Separator: React.ComponentType;
}

/**
 * The menu body, rendered through whichever surface's primitives it is handed.
 *
 * A component rather than a helper function so the mutations behind the items
 * mount HERE — inside a Radix `Content`, which only exists while the menu is
 * open. That placement is the whole optimization; see `useNoteActionItems`.
 *
 * `Item`/`Separator` are passed in because Radix's dropdown and context menus
 * are separate primitives with the same shape. Injecting them keeps one item
 * list serving both without this file knowing which surface it is in.
 */
export function NoteMenuItems({
  Item,
  Separator,
  ...target
}: NoteMenuItemsProps) {
  const items: NoteActionItem[] = useNoteActionItems(target);

  return (
    <>
      {items.map((item) => (
        <Fragment key={item.id}>
          {item.separatorBefore && <Separator />}
          <Item
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={cn(
              item.destructive && 'text-destructive focus:text-destructive'
            )}
          >
            {item.icon}
            {item.label}
          </Item>
        </Fragment>
      ))}
    </>
  );
}
