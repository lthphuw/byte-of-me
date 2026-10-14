'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EditorProps } from '@tiptap/pm/view';
import {
  type Content,
  type Editor,
  EditorContent,
  type JSONContent,
  useEditor,
} from '@tiptap/react';

import { useMediaQuery } from '../../hooks/use-media-query';
import { cn } from '../../lib/utils';

import { createExtensions } from './create-extensions';
import type { EditorLabels } from './editor-labels';
import { EditorPreview } from './editor-preview';
import { TipTapFloatingMenu } from './extensions/floating-menu';
import type { ImageUploadFn } from './extensions/image';
import { MobileEditorTools } from './mobile-tools';
import { OutlineAside } from './outline-aside';
import { EditorToolbar } from './toolbars/editor-toolbar';
import {
  type RichTextChangeMeta,
  useDebouncedChange,
  useFlushBeforeSubmit,
} from './use-debounced-change';
import { useOutline } from './use-outline';

import './editor-surface.css';

export type { RichTextChangeMeta } from './use-debounced-change';

const COMPACT_MAX_HEIGHT = 360;

type RichTextEditorProps = {
  className?: string;
  value?: Content;
  onChange?: (value: JSONContent, meta: RichTextChangeMeta) => void;
  uploadImage?: ImageUploadFn;
  /**
   * Shown when an image upload is refused with no message of its own, in the
   * app's language. Required: an optional prop would let an editor drop it.
   */
  uploadFailedText: string;
  /** Every line of text the editor draws; the app translates it (`EditorLabels`). */
  labels: EditorLabels;
  /** Drops the outline aside and lets the editor size itself to its content. */
  compact?: boolean;
  /** Editing area height floor, in px; compact only (default 160). */
  minHeight?: number;
  placeholder?: string;
  /**
   * Renders the toolbar into this element instead of the top of the frame, so a
   * frame far down a long form can keep its bar on screen in a sticky element.
   */
  toolbarTarget?: HTMLElement | null;
  /**
   * What `<FormControl>`'s Slot injects. They land on the CONTENTEDITABLE, not
   * the frame: a `<FormLabel htmlFor>` has to resolve to something focusable.
   */
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
};

export function RichTextEditor({
  className,
  value,
  onChange,
  uploadImage,
  uploadFailedText,
  labels,
  compact = false,
  minHeight,
  placeholder,
  toolbarTarget = null,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: RichTextEditorProps) {
  const isNarrow = useMediaQuery('(max-width: 767px)');
  const isWide = useMediaQuery('(min-width: 1024px)');
  // Snapshot of the document taken when preview is switched on. The editor
  // stays mounted (hidden) underneath, so toggling back loses nothing.
  const [preview, setPreview] = useState<JSONContent | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const outline = useOutline(!compact);
  const change = useDebouncedChange(onChange);

  // `useEditor` compares options by IDENTITY each render, and a miss costs a
  // `setOptions` -> `view.updateState` walk of the whole document; a changed
  // attribute reaches the live view through that same call.
  const editorProps = useMemo<EditorProps>(() => {
    const attributes: Record<string, string> = {};
    if (id !== undefined) attributes.id = id;
    if (ariaDescribedBy !== undefined)
      attributes['aria-describedby'] = ariaDescribedBy;
    if (ariaInvalid !== undefined)
      attributes['aria-invalid'] = String(ariaInvalid);
    return { attributes };
  }, [id, ariaDescribedBy, ariaInvalid]);

  // Mount-only: `useEditor` freezes the extension list, so nothing here is
  // read again after the first render.
  const extensions = useMemo(
    () => [
      ...createExtensions({
        uploadImage,
        uploadFailedText,
        labels,
        placeholder,
      }),
      ...outline.extensions,
    ],
    [labels, outline.extensions, placeholder, uploadFailedText, uploadImage]
  );

  const { scheduleRebuild } = outline;
  const { onUpdate: reportChange, flush } = change;
  // Tiptap reports every document change here, including the ones its own
  // extensions make; the outline waits for the author to pause, `onChange` too.
  const onUpdate = useCallback(
    (props: { editor: Editor }) => {
      scheduleRebuild(props.editor);
      reportChange(props);
    },
    [scheduleRebuild, reportChange]
  );

  // Tiptap reads `content` once, when it builds the document; a form that
  // swaps the value for another record remounts this component instead.
  const [initialContent] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    // Controls subscribe through `useEditorState`, so a selection move does not
    // re-render this host.
    shouldRerenderOnTransaction: false,
    editorProps,
    extensions,
    content: initialContent,
    onBlur: flush,
    onUpdate,
  });

  useFlushBeforeSubmit(editor, flush);

  if (!editor) return null;

  const toolbar = (
    <EditorToolbar
      editor={editor}
      labels={labels}
      compact={compact}
      previewing={preview !== null}
      onTogglePreview={
        compact
          ? undefined
          : () => setPreview((p) => (p ? null : editor.getJSON()))
      }
    />
  );
  const showOutline = !compact && isWide && preview === null;

  return (
    <div
      // The tighter of the two rhythms in `editor-surface.css`: an editor in a
      // form card is a field, so it gets the document rules at a smaller scale.
      data-editor-density={compact ? 'compact' : undefined}
      // `overflow-clip`, not `hidden`: hidden makes a scroll container, which
      // traps the toolbar's `sticky top-0` and lets it drift away.
      className={cn(
        'relative flex w-full flex-col overflow-clip border bg-card',
        className
      )}
    >
      {toolbarTarget ? createPortal(toolbar, toolbarTarget) : toolbar}

      <div
        className={cn('flex flex-row', !compact && 'h-[min(720px,62dvh)]')}
        style={
          compact
            ? { minHeight: minHeight ?? 160, maxHeight: COMPACT_MAX_HEIGHT }
            : undefined
        }
      >
        {preview !== null && <EditorPreview content={preview} />}

        {/* `min-w-0` keeps a wide line (long URL, table, code block) scrolling
            inside the editor instead of stretching its container. */}
        <div
          ref={scrollRef}
          className={cn(
            'relative min-w-0 flex-1 overflow-y-auto',
            compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6',
            showOutline && 'border-r',
            preview !== null && 'hidden'
          )}
        >
          {/* A 20-item slash palette overwhelms an editor in a form card, and a
              phone has its own tools. */}
          {!compact && !isNarrow && (
            <TipTapFloatingMenu editor={editor} labels={labels} />
          )}
          <EditorContent editor={editor} />
        </div>

        {showOutline && (
          <OutlineAside
            editor={editor}
            labels={labels}
            entries={outline.entries}
            scrollRoot={scrollRef}
            headingsChanged={outline.headingsChanged}
          />
        )}
      </div>

      {/* Anchored to the FRAME, outside the scrolling column: nested in it an
          `absolute inset-0` overlay scrolls away with the document. */}
      {!compact && isNarrow && preview === null && (
        <MobileEditorTools
          editor={editor}
          uploadImage={uploadImage}
          uploadFailedText={uploadFailedText}
          labels={labels}
        />
      )}
    </div>
  );
}
