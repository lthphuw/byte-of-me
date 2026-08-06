import { Skeleton } from '@byte-of-me/ui';

import {
  NOTE_ROW_BODY_CLASS,
  NOTE_ROW_BOX_CLASS,
  NOTE_ROW_CHEVRON_CLASS,
  NOTE_ROW_ICON_CLASS,
  noteRowIndent,
} from '@/entities/note/ui/note-row-shell';
import { cn } from '@/shared/lib/utils';

/**
 * Title-bar widths, cycled by row index. Six identical bars read as a striped
 * block; titles in a real tree are all different lengths, so the placeholder
 * has to be too or it stops looking like a list of documents.
 */
const TITLE_WIDTHS = ['w-[55%]', 'w-[70%]', 'w-[80%]'];

interface NoteRowSkeletonProps {
  /**
   * Indentation level, applied with the SAME formula `NoteTreeItem` uses —
   * a nested placeholder that ignores it lands in the root column and reads
   * as a sibling of the folder it belongs to.
   */
  depth?: number;
  /** Position in a stack. Only picks which title width this row draws. */
  index?: number;
}

/**
 * One tree row, in placeholder form.
 *
 * The box comes from `note-row-shell.ts`, the single definition every
 * row-shaped thing shares — not copied class-for-class from `NoteTreeItem`,
 * because that copy is exactly how the two drifted apart in the first place.
 * The previous placeholder was a lone `h-6` bar: shorter than the row and in
 * no column at all, so it neither held the row's height nor read as a child
 * node.
 */
export function NoteRowSkeleton({
  depth = 0,
  index = 0,
}: NoteRowSkeletonProps) {
  return (
    <div aria-hidden className={NOTE_ROW_BOX_CLASS} style={noteRowIndent(depth)}>
      {/* The chevron's column. Left empty rather than filled with a bar:
          most rows are leaves, and the real component renders their chevron
          `invisible` — a bar here would promise an affordance the loaded tree
          then takes away. */}
      <div className={NOTE_ROW_CHEVRON_CLASS} />

      <div className={NOTE_ROW_BODY_CLASS}>
        <Skeleton className={NOTE_ROW_ICON_CLASS} />

        {/* `h-5` is the line box `text-sm` gives the real title. Above `md`,
            where `min-h-0` hands the row's height back to its content, that
            box is what makes the row 32px — the bar inside is thinner than
            its line, the way a glyph is. */}
        <span className="flex h-5 min-w-0 flex-1 items-center">
          <Skeleton
            className={cn('h-3.5', TITLE_WIDTHS[index % TITLE_WIDTHS.length])}
          />
        </span>
      </div>
    </div>
  );
}

/**
 * The root level, loading. No padding of its own: the panel's scroller
 * already supplies it, and each row carries its own indentation, so the
 * placeholder rows line up exactly where the real ones will land.
 */
export function NoteTreeSkeleton() {
  return (
    <div aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <NoteRowSkeleton key={index} index={index} />
      ))}
    </div>
  );
}
