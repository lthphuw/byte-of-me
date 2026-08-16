'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import TableOfContents, {
  getHierarchicalIndexes,
  type TableOfContentDataItem,
} from '@tiptap/extension-table-of-contents';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { Markdown } from '@tiptap/markdown';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import {
  type Content,
  type Editor,
  EditorContent,
  type Extension,
  type JSONContent,
  useEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';

import { useMediaQuery } from '../../hooks/use-media-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../index';
import { scrollIntoViewBehavior } from '../../lib/prefers-reduced-motion';
import { cn } from '../../lib/utils';

import { EditorPreview } from './editor-preview';
import { TipTapFloatingMenu } from './extensions/floating-menu';
import { FloatingToolbar } from './extensions/floating-toolbar';
import {
  ImageExtension,
  type ImageUploadFn,
} from './extensions/image';
import { ImageGroup } from './extensions/image-group';
import { ImagePlaceholder } from './extensions/image-placeholder';
import { LinkSuggestion } from './extensions/link-suggestion';
import { NotesBlockMath, NotesInlineMath } from './extensions/math';
import { Citation } from './extensions/references/citation';
import { ReferenceList } from './extensions/references/reference-list';
import { ReferencePanel } from './extensions/references/reference-panel';
import SearchAndReplace from './extensions/search-and-replace';
import { imageFilesFrom, uploadImages } from './extensions/upload-images';
import { MobileEditorTools } from './mobile-tools';
// Shared with the server-side render schema so both stay identical.
import { CustomHeading } from './render-extensions';
import { EditorToolbar } from './toolbars/editor-toolbar';

import './editor-surface.css';
// Unconditional import in a file that is already a lazy chunk public pages
// never load; only the `withMath` option below gates the extension itself.
import 'katex/dist/katex.min.css';

// The editor is already a lazy chunk, so the full common grammar set is fine.
const lowlight = createLowlight(common);

const DEFAULT_PLACEHOLDER = "Write, type '/' for commands";

export function createExtensions(options?: {
  uploadImage?: ImageUploadFn;
  placeholder?: string;
  /** Registers KaTeX math nodes (`$…$` inline, `$$…$$` block). Opt-in. */
  withMath?: boolean;
}) {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      // Registered explicitly below; leaving them on duplicates the extension
      // names ('link', 'underline') and Tiptap warns on every editor mount.
      link: false,
      underline: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    CustomHeading,
    Placeholder.configure({
      placeholder: options?.placeholder ?? DEFAULT_PLACEHOLDER,
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Subscript,
    Superscript,
    Underline,
    Link,
    Color,
    Highlight.configure({ multicolor: true }),
    ImageExtension.configure({ uploadFn: options?.uploadImage }),
    // Two or more images side by side, with one caption for the row. Every
    // editor built from this list gets it — full, compact (the dashboard
    // dialogs) and chromeless (notes) — because the row is a document node,
    // not a chrome feature.
    ImageGroup,
    ImagePlaceholder,
    SearchAndReplace,
    Typography,
    TableKit.configure({ table: { resizable: false } }),
    // Markdown in, markdown understood: pasting a README-style document turns
    // into real headings/lists/tables/code blocks instead of flat text.
    Markdown,
    Citation,
    ReferenceList,
    // A typo inside a formula must render as an error message in red, not
    // throw out of ProseMirror's render path and blank the editor.
    ...(options?.withMath
      ? [
          NotesInlineMath.configure({ katexOptions: { throwOnError: false } }),
          NotesBlockMath.configure({ katexOptions: { throwOnError: false } }),
        ]
      : []),
  ];
}



/**
 * Why an `onChange` reported what it did.
 *
 * `initial` is true for a document the EDITOR produced while opening the one
 * it was given, rather than one the author edited. That is not hypothetical:
 * `TableOfContents` (registered below whenever `compact` is false) assigns a
 * fresh id to every heading that lacks one, from `onCreate`, and Tiptap fires
 * `onUpdate` for any transaction that changes the document — its own
 * extensions' included. The reported JSON also carries parse-time attribute
 * defaults (`textAlign: null`, …), so it is never byte-identical to the
 * string that was loaded either.
 *
 * A consumer cannot recover this from the JSON alone: the initial document
 * differs from what it seeded, and "ignore the first emit" is wrong because
 * an editor with nothing to rewrite (no headings) never emits at all, so the
 * first emit would be the author's first edit. Only the editor knows which
 * one it is sending, so only the editor can say.
 *
 * Ignoring it is a per-consumer decision, deliberately: a form that wants the
 * normalised document in its state (every `react-hook-form` call site here)
 * keeps working unchanged, while an autosave that must not write on open
 * (`note-editor.tsx`) checks the flag.
 */
export interface RichTextChangeMeta {
  initial: boolean;
}

/** One heading in the document, as the outline/ToC consumers render it. */
export interface OutlineItem {
  /** The heading element's DOM id — scroll targets resolve through it. */
  id: string;
  level: number;
  text: string;
  /** The heading the viewport currently sits under. */
  isActive: boolean;
}

type RichTextEditorProps = {
  className?: string;
  value?: Content;
  onChange?: (value: JSONContent, meta: RichTextChangeMeta) => void;
  uploadImage?: ImageUploadFn;
  /**
   * Drops the outline/references sidebar and lets the editor size itself to
   * its content, so it can sit inside a form card instead of owning a page.
   */
  compact?: boolean;
  /** Editing area height floor, in px. Defaults to 600 (full) / 160 (compact). */
  minHeight?: number;
  placeholder?: string;
  /**
   * Hides the toolbar and leaves only the writing surface, for a context where
   * the author composes in markdown and never reaches for a button — the
   * private notes workspace.
   *
   * Formatting is not lost with it: StarterKit's input rules turn `## `,
   * `**bold**`, `- `, `> ` and friends into real nodes as they are typed, and
   * the selection bubble bar still appears over a selection.
   *
   * Additive on purpose — every other consumer (blog, project, education,
   * profile) omits it and keeps the toolbar exactly as it was.
   */
  chromeless?: boolean;
  /**
   * Makes the writing surface take the height its parent gives it instead of
   * the fixed `h-[min(720px,62dvh)]` below.
   *
   * That fixed height is right for an editor embedded in a scrolling form —
   * it stops one long field from pushing the rest of the form off screen. It
   * is wrong for a surface that *is* the page: inside the notes workspace it
   * created a second scroll container nested in the page's own, so a phone
   * ended up with a ~60dvh box scrolling inside a full-height pane, and the
   * visible writing area was a fraction of the screen.
   *
   * Additive like `chromeless`: only the notes workspace passes it, so every
   * dashboard form keeps the height it has.
   */
  fill?: boolean;
  /**
   * Opt into the `[[` link trigger.
   *
   * Called when the author types `[[` (already removed from the document by
   * then) and handed the function that inserts the chosen link. The consumer
   * owns the picker and the data — this component never learns what a "note"
   * is, only how to insert a link mark — and simply does not call back if the
   * author dismisses it.
   */
  onLinkTrigger?: (
    insertLink: (link: { text: string; href: string }) => void
  ) => void;
  /**
   * Registers the KaTeX math nodes — `$…$` inline, `$$…$$` block, rendered
   * live as the author types. Additive like `chromeless`: only the notes
   * workspace passes it, so every other editor keeps `$` a literal dollar.
   */
  withMath?: boolean;
  /**
   * The document's heading outline, re-reported whenever it changes. What the
   * notes workspace renders its ToC tab from: the TableOfContents extension is
   * registered for every non-compact editor, but chromeless surfaces hide the
   * built-in outline aside, so this hands the same data to a consumer-owned
   * panel instead.
   */
  onOutlineChange?: (items: OutlineItem[]) => void;
  /**
   * Swaps the writing surface for the document's raw markdown source in a
   * monospace textarea. The Tiptap editor stays mounted (hidden) underneath —
   * the document remains the single source of truth: entering raw mode
   * serializes it, edits are debounced back into it through the Markdown
   * extension (so `onChange` and any autosave keep working), and leaving raw
   * mode simply reveals the editor again.
   */
  markdownMode?: boolean;
  /**
   * Handed the editor's serializers once it exists, and `null` when it goes
   * away.
   *
   * A callback rather than an imperative handle on a `ref`: the Tiptap
   * instance is created asynchronously, so a consumer reading a ref at the
   * wrong moment gets `null` with nothing to distinguish "not ready yet" from
   * "broken". Being told when it becomes available removes that ambiguity.
   */
  onEditorApi?: (api: RichTextEditorApi | null) => void;
};

/** What a consumer can ask the live editor for. */
export interface RichTextEditorApi {
  /**
   * The current document, serialized to markdown.
   *
   * Flushes any pending raw-mode edit first. The textarea's buffer is NOT in
   * the document until `flushRaw` runs (it is debounced by 800ms), so calling
   * this mid-edit would otherwise serialize the PRE-edit document and write
   * the wrong thing to an exported file, silently.
   */
  getMarkdown: () => string;
}

const COMPACT_MAX_HEIGHT = 360;

/**
 * Uploads dropped/pasted files and inserts each as an image node.
 *
 * Positions are resolved against the document as it is at insert time rather
 * than captured up front: an upload takes a round trip, and anything the
 * author types meanwhile would shift a stale offset and land the image in the
 * middle of a word. `at` is only a starting point; after the first insert the
 * rest follow it.
 *
 * A failed upload is skipped rather than aborting the batch, and reported —
 * `uploadImages` owns both halves. It used to skip silently here, on the
 * strength of a comment claiming the uploader raised its own toast:
 * `uploadSingleMedia` only throws, so a refused file (wrong type, over 3 MB)
 * left the author with no image and no explanation.
 */
function insertUploadedImages(
  view: { state: EditorState; dispatch: (tr: Transaction) => void },
  files: File[],
  upload: ImageUploadFn,
  at?: number
): void {
  void (async () => {
    const uploaded = await uploadImages(files, upload);
    let insertAt = at;

    for (const image of uploaded) {
      const imageType = view.state.schema.nodes.image;
      if (!imageType) return;

      const pos = insertAt ?? view.state.selection.from;
      const node = imageType.create(image);
      view.dispatch(view.state.tr.insert(pos, node));
      insertAt = pos + node.nodeSize;
    }
  })();
}

export function RichTextEditor({
  className,
  value,
  onChange,
  uploadImage,
  compact = false,
  minHeight,
  placeholder,
  chromeless = false,
  fill = false,
  onLinkTrigger,
  withMath = false,
  markdownMode = false,
  onOutlineChange,
  onEditorApi,
}: RichTextEditorProps) {
  // Matches the `md` breakpoint the notes workspace switches its layout at.
  const isNarrow = useMediaQuery('(max-width: 767px)');
  const [items, setItems] = useState<TableOfContentDataItem[]>([]);

  // Both refs exist for the same reason: the extension list is built once,
  // when `useEditor` first runs, so anything it closes over is frozen at that
  // moment. A consumer's `onLinkTrigger` is typically a fresh closure every
  // render, and the editor does not exist yet at all. Reading both through
  // refs at call time keeps the handler current without rebuilding the editor
  // — which would remount the document and lose the selection.
  const editorRef = useRef<Editor | null>(null);
  const onLinkTriggerRef = useRef(onLinkTrigger);

  useEffect(() => {
    onLinkTriggerRef.current = onLinkTrigger;
  }, [onLinkTrigger]);

  // Same frozen-extension-list reason as `onLinkTriggerRef` above: the ToC
  // extension's onUpdate closure is built once, so it reads the CURRENT
  // consumer callback through a ref.
  const onOutlineChangeRef = useRef(onOutlineChange);
  useEffect(() => {
    onOutlineChangeRef.current = onOutlineChange;
  }, [onOutlineChange]);

  const handleLinkTrigger = useCallback(() => {
    onLinkTriggerRef.current?.((link) => {
      // Inserted at the live selection rather than at the position the
      // trigger was typed: the picker is a modal dialog, so the document
      // cannot have moved under it, and reading the selection now avoids
      // holding a position across an await that could go stale.
      editorRef.current
        ?.chain()
        .focus()
        .insertContent([
          {
            type: 'text',
            text: link.text,
            marks: [{ type: 'link', attrs: { href: link.href } }],
          },
          // A trailing unmarked space so the author keeps typing outside the
          // link instead of extending it.
          { type: 'text', text: ' ' },
        ])
        .run();
    });
  }, []);
  // Snapshot of the document taken when preview is switched on. The editor
  // stays mounted (hidden) underneath, so toggling back loses nothing.
  const [preview, setPreview] = useState<JSONContent | null>(null);

  // The raw-markdown buffer. Non-null exactly while `markdownMode` is on —
  // seeded from the document on entry, cleared on exit. Kept as local state
  // (not derived per render) so typing in the textarea does not re-serialize
  // the whole document on every keystroke.
  const [rawText, setRawText] = useState<string | null>(null);
  const rawDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    // Tiptap 3 stops re-rendering on transactions by default, which leaves
    // every toolbar reading stale `isActive`/`can()`/`getAttributes` state.
    shouldRerenderOnTransaction: true,
    editorProps: {
      /**
       * Drop an image file anywhere on the writing surface and it uploads and
       * lands where it was dropped — not at the caret, which is usually
       * somewhere else entirely and is the thing that makes drag-and-drop feel
       * broken.
       *
       * Only claims the event when there is actually an image file AND an
       * uploader: without that guard this would swallow ProseMirror's own
       * node drags (moving a paragraph or an existing image within the
       * document), which arrive through the same handler.
       */
      handleDrop(view, event, _slice, moved) {
        if (moved || !uploadImage) return false;

        const files = imageFilesFrom((event as DragEvent).dataTransfer?.files);
        if (files.length === 0) return false;

        event.preventDefault();

        const dropped = view.posAtCoords({
          left: (event as DragEvent).clientX,
          top: (event as DragEvent).clientY,
        });
        insertUploadedImages(view, files, uploadImage, dropped?.pos);
        return true;
      },

      /** Same contract for a pasted screenshot, inserted at the caret. */
      handlePaste(view, event) {
        if (!uploadImage) return false;

        const files = imageFilesFrom(
          (event as ClipboardEvent).clipboardData?.files
        );
        if (files.length === 0) return false;

        event.preventDefault();
        insertUploadedImages(view, files, uploadImage);
        return true;
      },
    },
    extensions: [
      ...createExtensions({ uploadImage, placeholder, withMath }),
      // Registered only when a consumer wants it, so `[[` stays two literal
      // brackets everywhere else — a code snippet in a blog post is not a
      // link picker.
      ...(onLinkTrigger
        ? [LinkSuggestion.configure({ onTrigger: handleLinkTrigger })]
        : []),
      // The outline is only ever read by the sidebar, so compact mode skips
      // tracking it entirely.
      ...(compact
        ? []
        : [
            TableOfContents.configure({
              getIndex: getHierarchicalIndexes,
              onUpdate(content) {
                setItems(content);
                onOutlineChangeRef.current?.(
                  content.map((item) => ({
                    id: item.id,
                    level: item.level ?? 1,
                    text: item.textContent,
                    isActive: Boolean(item.isActive),
                  }))
                );
              },
            }),
          ]),
    ] as Extension[],
    content: value,
    onUpdate: ({ editor }) => {
      // `isInitialized` is Tiptap's own flag, not a heuristic: the editor
      // sets it true immediately after emitting `create`, and the extension
      // `onCreate` handlers that rewrite the document (see
      // `RichTextChangeMeta`) run inside that emit — so it is false for
      // exactly the updates the editor caused while opening, and true for
      // everything the author does afterwards. A keystroke cannot land
      // earlier: `create` is emitted from a `setTimeout(0)` scheduled the
      // moment the view mounts, before the editor is on screen to type into.
      onChange?.(editor.getJSON(), { initial: !editor.isInitialized });
    },
  });

  // Assigned in an effect, not during render, so the ref only ever points at
  // an editor that is actually mounted. Must sit above the early return
  // below — a hook after a conditional return is a hook that sometimes does
  // not run.
  useEffect(() => {
    editorRef.current = editor ?? null;
  }, [editor]);

  // The raw text most recently typed but not yet parsed into the document.
  // Exists so leaving raw mode (or unmounting) can FLUSH the pending edit
  // instead of cancelling it — a debounce that simply dies loses the last
  // 800ms of typing.
  const pendingRawRef = useRef<string | null>(null);

  const flushRaw = useCallback(() => {
    if (rawDebounceRef.current) {
      clearTimeout(rawDebounceRef.current);
      rawDebounceRef.current = null;
    }
    if (pendingRawRef.current !== null) {
      editorRef.current?.commands.setContent(pendingRawRef.current, {
        contentType: 'markdown',
        emitUpdate: true,
      });
      pendingRawRef.current = null;
    }
  }, []);

  const applyRaw = useCallback(
    (raw: string) => {
      setRawText(raw);
      pendingRawRef.current = raw;
      if (rawDebounceRef.current) clearTimeout(rawDebounceRef.current);
      // Debounced, not per-keystroke: parsing the whole document through the
      // Markdown extension on every character would make the textarea lag on
      // long notes. `emitUpdate: true` keeps the consumer's onChange (and any
      // autosave behind it) in the loop for edits made in raw mode.
      rawDebounceRef.current = setTimeout(flushRaw, 800);
    },
    [flushRaw]
  );

  // Entering raw mode serializes the CURRENT document; leaving it flushes any
  // pending raw edit and reveals the editor again.
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    if (markdownMode) {
      setRawText(currentEditor.getMarkdown());
    } else {
      flushRaw();
      setRawText(null);
    }
  }, [markdownMode, flushRaw, editor]);

  // Unmount: a pending raw edit still lands in the document, so the consumer's
  // onChange has seen it even if the author closes mid-debounce.
  useEffect(() => flushRaw, [flushRaw]);

  // Hand the consumer the serializers, and revoke them on the way out. The
  // callback goes through a ref for the same reason `onLinkTrigger` does: it
  // is a fresh closure each render, and depending on it directly here would
  // re-run this effect every render — publishing and revoking the API on a
  // loop.
  const onEditorApiRef = useRef(onEditorApi);
  onEditorApiRef.current = onEditorApi;

  useEffect(() => {
    if (!editor) return;
    const api: RichTextEditorApi = {
      getMarkdown: () => {
        flushRaw();
        return editor.getMarkdown();
      },
    };
    onEditorApiRef.current?.(api);
    return () => onEditorApiRef.current?.(null);
  }, [editor, flushRaw]);

  if (!editor) return null;

  const rawActive = markdownMode && rawText !== null;

  return (
    <div
      // Picks the tighter of the two rhythms in `editor-surface.css`. An
      // editor embedded in a form card is a FIELD — it gets the document
      // rules at a smaller scale rather than a stylesheet of its own, which
      // is what the deleted `tiptap-lite.css` used to be.
      data-editor-density={compact ? 'compact' : undefined}
      // `overflow-clip`, NOT `overflow-hidden`: hidden makes this element a
      // scroll container, which traps the toolbar's `sticky top-0` inside it —
      // scroll the page/dialog and the toolbar drifts away. `clip` still cuts
      // the rounded corners but lets sticky anchor to the outer scrollport.
      className={cn(
        'relative flex w-full flex-col overflow-clip',
        // `min-h-0` alongside `h-full`: without it this flex column refuses to
        // shrink below its content's min-content height and the surface
        // overflows its parent instead of scrolling inside it.
        fill && 'h-full min-h-0',
        // Chromeless sits inside a surface that already draws its own frame
        // (the notes workspace), so a card border and fill here would be a box
        // inside a box. Everywhere else the editor IS the card.
        chromeless ? 'bg-transparent' : 'border bg-card',
        className
      )}
    >
      {!chromeless && (
        <EditorToolbar
          editor={editor}
          compact={compact}
          previewing={preview !== null}
          onTogglePreview={
            compact
              ? undefined
              : () => setPreview((p) => (p ? null : editor.getJSON()))
          }
        />
      )}

      <div
        // Viewport-relative on tall screens, capped on short ones — a fixed
        // 600px left the editor cramped inside the near-full-height dialog.
        className={cn(
          'flex flex-row',
          !compact && !fill && 'h-[min(720px,62dvh)]',
          !compact && fill && 'min-h-0 flex-1'
        )}
        style={
          compact
            ? { minHeight: minHeight ?? 160, maxHeight: COMPACT_MAX_HEIGHT }
            : undefined
        }
      >
        {preview !== null && <EditorPreview content={preview} />}

        {/* Editor Side */}
        {/* `min-w-0` keeps a wide line (long URL, table, code block) scrolling
            inside the editor instead of stretching its container. */}
        <div
          className={cn(
            'relative min-w-0 flex-1 overflow-y-auto p-4 sm:p-6',
            // The border divides the writing column from the outline aside;
            // with that aside gone (chromeless, below) it would just be a
            // stray line down the right edge of the page.
            !compact && !chromeless && 'border-r',
            compact && 'p-3 sm:p-4',
            preview !== null && 'hidden'
          )}
        >
          {/* Both are page-scale surfaces: a full-width bubble bar and a
              20-item slash palette overwhelm an editor embedded in a form
              card, where the toolbar above already covers everything. */}
          {/* Both are page-scale surfaces, and both are DESKTOP-only.
              Mounting Tiptap's `BubbleMenu` at phone width sends React into
              "Maximum update depth exceeded": its positioning effect dispatches
              a ProseMirror transaction, the transaction re-renders the editor
              (`shouldRerenderOnTransaction`), and the effect runs again. It
              only settles when there is room to place the bar. Reachable from
              any dialog-hosted editor on a phone; the notes workspace is simply
              the first surface where the full editor is reachable at that
              width, which is how it surfaced. */}
          {!compact && !isNarrow && !rawActive && (
            <>
              <FloatingToolbar editor={editor} />
              <TipTapFloatingMenu editor={editor} />
            </>
          )}
          {rawActive && (
            <textarea
              value={rawText ?? ''}
              onChange={(event) => applyRaw(event.target.value)}
              spellCheck={false}
              aria-label="Markdown source"
              className="min-h-full w-full resize-none bg-transparent font-mono text-sm leading-relaxed outline-none"
            />
          )}
          {/* Hidden, not unmounted: the document underneath is what raw edits
              parse back into, and what WYSIWYG mode reveals again. */}
          <div className={cn(rawActive && 'hidden')}>
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Not for `chromeless`: the notes workspace already spends 56px on
            the space rail and 256px on the note tree, and a third 288px
            column leaves the writing column narrower than the chrome around
            it. Notes surfaces its own links panel in that slot instead, which
            is the navigation an author of linked notes actually reaches for.
            Every other consumer keeps the outline exactly as it was. */}
        {!compact && !chromeless && preview === null && (
        <aside className="hidden w-72 shrink-0 bg-muted/10 lg:block">
          <Tabs defaultValue="outline" className="flex h-full flex-col">
            <TabsList className="m-3 grid grid-cols-2">
              <TabsTrigger value="outline">Outline</TabsTrigger>
              <TabsTrigger value="references">References</TabsTrigger>
            </TabsList>

            <TabsContent
              value="outline"
              className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 pb-6"
            >
              <div className="flex flex-col gap-2 border-l border-muted-foreground/20">
                {items.map((item) => (
                  <button
                    type={'button'}
                    key={item.id}
                    onClick={(e) => {
                      e?.preventDefault();

                      const el = document.getElementById(item.id);
                      el?.scrollIntoView({ behavior: scrollIntoViewBehavior() });
                    }}
                    className={cn(
                      'text-xs text-left px-4 py-1 hover:text-primary transition-all border-l-2 -ml-[1px] border-transparent hover:border-primary',
                      item.isActive && 'text-primary border-primary',
                      item.level === 1 && 'font-bold text-sm',
                      item.level === 2 && 'ml-2 font-semibold',
                      item.level === 3 && 'ml-4  font-normal text-muted-foreground'
                    )}
                  >
                    {item.textContent}
                  </button>
                ))}
                {items.length === 0 && (
                  <p className="px-4 py-1 text-xs text-muted-foreground">
                    Headings you add will show up here.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="references"
              className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 pb-6"
            >
              <ReferencePanel editor={editor} />
            </TabsContent>
          </Tabs>
        </aside>
        )}
      </div>

      {/* Anchored to the editor FRAME, deliberately outside the scrolling
          column above. Nested inside it, an `absolute inset-0` overlay resizes
          with the document's scroll height, and that layout change retriggers
          the bubble menu's positioning effect, which dispatches a ProseMirror
          transaction, which re-renders — a loop React stops with "Maximum
          update depth exceeded" the moment a note is opened on a phone.
          Only chromeless: everywhere else the real toolbar is already on
          screen at every width. */}
      {chromeless && !rawActive && (
        <MobileEditorTools editor={editor} uploadImage={uploadImage} />
      )}
    </div>
  );
}
