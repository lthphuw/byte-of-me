'use client';

import {
  // Aliased, not imported under its own name: `handlePaste` below casts to the
  // DOM's global `ClipboardEvent`, and importing React's synthetic one would
  // shadow it — the two are not assignable to each other, so the shadowing
  // does not stay quiet, it breaks the cast.
  type ClipboardEvent as ReactClipboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import type { EditorProps } from '@tiptap/pm/view';
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
import { formatMarkdown } from '../../lib/markdown-format';
import { scrollIntoViewBehavior } from '../../lib/prefers-reduced-motion';
import { cn } from '../../lib/utils';

import { EditorPreview } from './editor-preview';
import { TipTapFloatingMenu } from './extensions/floating-menu';
import { FloatingToolbar } from './extensions/floating-toolbar';
import { TableHeaderScopes } from './extensions/header-scopes-plugin';
import {
  ImageExtension,
  type ImageUploadFn,
} from './extensions/image';
import { ImageGroup } from './extensions/image-group';
import { ImagePlaceholder } from './extensions/image-placeholder';
import { LinkSuggestion } from './extensions/link-suggestion';
import { NotesBlockMath, NotesInlineMath } from './extensions/math';
import { NumericTableColumns } from './extensions/numeric-columns-plugin';
import { Citation } from './extensions/references/citation';
import { ReferenceList } from './extensions/references/reference-list';
import { ReferencePanel } from './extensions/references/reference-panel';
import SearchAndReplace from './extensions/search-and-replace';
import { imageFilesFrom, uploadImages } from './extensions/upload-images';
import { MobileEditorTools } from './mobile-tools';
import {
  anchorMapFor,
  applyEditorBlock,
  applyTextareaLine,
  blockAtLine,
  type MarkdownAnchorMap,
  readEditorBlock,
  readTextareaLine,
} from './mode-switch-anchor';
import { stripPastedPresentation } from './paste-presentation';
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
    // Right-aligns the columns that hold only figures, by the same rule the
    // render pass applies to published HTML — so a table looks the same while
    // it is being written as it does once it is read.
    NumericTableColumns,
    // `scope` on the header cells, by the same rule the render pass applies.
    // The published page has carried it since `ScopedTable`; the editor is
    // where the note's own author reads the document, and it had none — a
    // serializer-side side channel cannot reach a live view.
    TableHeaderScopes,
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
 * The outline, rebuilt after the author pauses instead of inside the keystroke.
 *
 * `@tiptap/extension-table-of-contents` rebuilds the whole outline from
 * `onTransaction`, synchronously, for every transaction that changes the
 * document. That is two full `doc.descendants` walks (`setTocData`, then
 * `addTocActiveStatesAndGetItems` over the result), and — per heading, in both
 * of them — a `view.domAtPos(pos).offsetTop` read. Reading `offsetTop` in the
 * same task ProseMirror has just mutated the DOM in forces the browser to flush
 * style and layout for the ENTIRE document before it can answer.
 *
 * On the note that motivated this (350KB, 3,797 nodes, 75+ headings, 30 tables,
 * 3,738 cells) one such flush measures ~280ms, and the extension asks for
 * roughly 150 of them per character typed. It then dispatches a second, empty
 * transaction to publish the result, which re-runs every plugin in the editor.
 *
 * So `onTransaction` is emptied and the same rebuild is driven from a debounce
 * below, through the extension's own `updateTableOfContents` command — the one
 * it already exposes for exactly this. Nothing is lost by the delay: the
 * outline is read by a sidebar list, which does not have to agree with the
 * document in the same frame as the keystroke, only shortly after it. Heading
 * ids are unaffected — those are assigned by the extension's `onCreate` and by
 * its ProseMirror plugin, neither of which is touched here.
 */
const DebouncedTableOfContents = TableOfContents.extend({
  onTransaction() {
    return undefined;
  },
});

/**
 * Long enough that a normal typing burst produces one rebuild rather than one
 * per word, short enough that the outline feels attached to the document when
 * the author stops to look at it.
 */
const OUTLINE_REBUILD_MS = 300;

/**
 * How far above the writing column the "already scrolled past" region reaches,
 * for the heading observer below.
 *
 * Any value taller than a document can be works — it only has to be impossible
 * to scroll clean past — and `rootMargin` offers no keyword for "unbounded".
 * A million CSS pixels is four hundred times the tallest note here.
 */
const ABOVE_VIEWPORT_PX = 1_000_000;

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
   * Browser spell checking, on the writing surface and on the raw-markdown
   * pane alike.
   *
   * Defaults to `true`, which is what a contenteditable does with no attribute
   * at all — so every existing consumer keeps the behaviour it has. The pane
   * is the exception: it hardcoded `spellCheck={false}` and now follows this
   * prop, because "spell check is off" being true of half the same editor
   * depending on which tab is showing is not a setting, it is a bug an author
   * reports as "it stopped underlining my typos".
   *
   * Applied to the live view as well as at mount — see the effect below for
   * why that takes a second write rather than falling out of the prop.
   */
  spellCheck?: boolean;
  /**
   * Tidy the raw-markdown source when LEAVING raw mode, just before the
   * pending edit is committed to the document.
   *
   * Off by default: an author who has not asked for a formatter must never
   * find their source rewritten. Exit is the one honest moment to run one —
   * it is a commit point the author chose, whereas formatting on a debounce or
   * on save fires mid-sentence and moves the text under a live caret.
   */
  formatMarkdownOnExit?: boolean;
  /**
   * Tidy a PASTED fragment as it lands in the raw-markdown pane, and nothing
   * else in it.
   *
   * Off by default, and deliberately narrower than {@link formatMarkdownOnExit}:
   * the text worth tidying is the README / chat answer / half a wiki page an
   * author just pasted, complete with tabs, `*` bullets and `#Heading`. What
   * they have already written by hand is left exactly as they wrote it.
   */
  formatMarkdownOnPaste?: boolean;
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
  /**
   * Accessibility wiring for the writing surface — what `<FormControl>`'s Radix
   * `Slot` injects into whatever it wraps.
   *
   * These land on the CONTENTEDITABLE ProseMirror renders, not on the frame
   * below: a `<FormLabel htmlFor>` has to resolve to something focusable, and
   * the wrapper `<div>` is not. Taking a fixed prop list with no rest spread is
   * what used to swallow them, leaving four labels pointing at nothing and the
   * error text unlinked from the field it describes.
   */
  id?: string;
  role?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
};

/** The outcome of {@link RichTextEditorApi.formatMarkdown}. */
export type FormatMarkdownResult =
  /** The pane's text was rewritten. */
  | 'formatted'
  /** Already tidy — the formatter is idempotent, so this is a real answer. */
  | 'unchanged'
  /** Raw mode is off, so there is no source text to tidy. */
  | 'unavailable';

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
  /**
   * Tidies the raw-markdown pane in place: whitespace, list markers, heading
   * spacing, table padding. See `lib/markdown-format` for exactly how little
   * it is allowed to touch.
   *
   * Only meaningful in raw mode, and deliberately not automatic. What the
   * SERIALIZER produces is already close to canonical — measured on a real
   * note: no trailing whitespace, no tabs, no runs of blank lines, `-` bullets
   * throughout — so running this on entry would be a no-op that costs a parse.
   * The text worth tidying is what an author PASTES into the pane, and only
   * they know when they have done that.
   */
  formatMarkdown: () => FormatMarkdownResult;
  /**
   * Drops a link into the document at the current selection.
   *
   * The same insertion the `[[` picker performs, exposed for consumers that
   * arrive at a link some other way — a file dropped onto the writing surface,
   * for instance, which has to leave something behind in the text that the
   * author can click.
   *
   * At the SELECTION, not at a caller-supplied position: an upload is an
   * await, and a document position held across one can name a place that no
   * longer exists. A caller that wants the drop point puts the caret there
   * first — `caretRangeFromPoint` and a DOM selection are enough, since
   * ProseMirror reads its selection back from the DOM.
   */
  insertLink: (link: { text: string; href: string }) => void;
  /**
   * The live editor, for a consumer that hosts one of the editor's own panels
   * in chrome of its own.
   *
   * The notes workspace is the case this exists for: it runs `chromeless`, so
   * the editor's References aside never renders, and the panel has to be
   * mounted in the workspace's sidebar instead. Everything reachable through
   * this is a Tiptap command — a consumer that only wants text should use the
   * three methods above, which say what they do.
   */
  editor: Editor;
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
  spellCheck = true,
  formatMarkdownOnExit = false,
  formatMarkdownOnPaste = false,
  onOutlineChange,
  onEditorApi,
  id,
  role,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
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

  /*
   * The two halves of what a consumer is told about the outline, held apart
   * because they change for different reasons: the LIST changes when the
   * document does (debounced — see `DebouncedTableOfContents`), the ACTIVE
   * entry when the reader scrolls. `reportOutline` is what joins them back
   * into the single payload `onOutlineChange` has always carried.
   *
   * The observer effect further down is what sets the active id, and its
   * comment is where the reasoning for all of this lives.
   */
  const outlineContentRef = useRef<TableOfContentDataItem[]>([]);
  const activeHeadingIdRef = useRef<string | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  // Set by that effect, called from `onUpdate` below: headings the observer is
  // watching are DOM elements, so a document that gained or lost one has to
  // point it at the new set.
  const observeHeadingsRef = useRef<(() => void) | null>(null);

  const reportOutline = useCallback(() => {
    const active = activeHeadingIdRef.current;
    onOutlineChangeRef.current?.(
      outlineContentRef.current.map((item) => ({
        id: item.id,
        level: item.level ?? 1,
        text: item.textContent,
        // Computed here rather than read from `item.isActive`: the extension
        // writes that flag from a `scroll` listener on `window`, and nothing
        // in this editor scrolls the window.
        isActive: item.id === active,
      }))
    );
  }, []);

  // The other half of `DebouncedTableOfContents` — see the note on it for what
  // the extension does per transaction and why none of it belongs in the frame
  // the keystroke lands in. Armed from `onUpdate` below, which Tiptap fires for
  // exactly the doc-changing transactions the extension used to listen for.
  const outlineRebuildRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleOutlineRebuild = useCallback(() => {
    if (outlineRebuildRef.current) clearTimeout(outlineRebuildRef.current);
    outlineRebuildRef.current = setTimeout(() => {
      outlineRebuildRef.current = null;
      // Optional because the editor can be torn down between the schedule and
      // the fire. The command itself is only registered when the extension is,
      // which is why the caller below checks `compact` before scheduling.
      editorRef.current?.commands.updateTableOfContents();
    }, OUTLINE_REBUILD_MS);
  }, []);

  // A pending rebuild reaches into `editor.view` when it fires, so a timer left
  // running past unmount would do that to a destroyed view.
  useEffect(
    () => () => {
      if (outlineRebuildRef.current) clearTimeout(outlineRebuildRef.current);
    },
    []
  );

  /**
   * One link, at the live selection.
   *
   * Shared by the `[[` picker and the imperative API, because they insert the
   * same thing and had no business drifting apart.
   */
  const insertLink = useCallback((link: { text: string; href: string }) => {
    // At the live selection rather than at a remembered position: both callers
    // arrive here after an await — a modal for the picker, an upload for a
    // dropped file — and a document position held across one can name a place
    // that no longer exists.
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
  }, []);

  const handleLinkTrigger = useCallback(() => {
    onLinkTriggerRef.current?.(insertLink);
  }, [insertLink]);
  // Snapshot of the document taken when preview is switched on. The editor
  // stays mounted (hidden) underneath, so toggling back loses nothing.
  const [preview, setPreview] = useState<JSONContent | null>(null);

  // The raw-markdown buffer. Non-null exactly while `markdownMode` is on —
  // seeded from the document on entry, cleared on exit. Kept as local state
  // (not derived per render) so typing in the textarea does not re-serialize
  // the whole document on every keystroke.
  const [rawText, setRawText] = useState<string | null>(null);
  const rawDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The <FormControl> attributes as ProseMirror wants them: strings, and
  // absent rather than `"undefined"` when the consumer passed nothing.
  const surfaceAttributes = useMemo(() => {
    const attributes: Record<string, string> = {};
    if (id !== undefined) attributes.id = id;
    if (role !== undefined) attributes.role = role;
    if (ariaLabelledBy !== undefined)
      attributes['aria-labelledby'] = ariaLabelledBy;
    if (ariaDescribedBy !== undefined)
      attributes['aria-describedby'] = ariaDescribedBy;
    if (ariaInvalid !== undefined)
      attributes['aria-invalid'] = String(ariaInvalid);
    return attributes;
  }, [id, role, ariaLabelledBy, ariaDescribedBy, ariaInvalid]);

  /*
   * Memoised because `useEditor` compares its options by IDENTITY on every
   * render.
   *
   * It runs `onRender(deps)` with no dependency array, so with `deps.length
   * === 0` it takes the "editor already exists" branch and calls
   * `compareOptions(nextOptions, editor.options)`. Every key but the callbacks
   * is compared with `!==`, so an inline object literal here never matches, and
   * the mismatch costs `editor.setOptions(...)` — which is `view.setProps()`
   * followed by `view.updateState(state)`: a decoration recompute and a
   * `docView.update` walk over the whole document, plus a selection sync that
   * can force layout. Twice per render, on a surface that re-renders on every
   * keystroke AND (via `shouldRerenderOnTransaction`) on every arrow key.
   *
   * The deps are the real ones rather than `[]`, but note that the list below
   * is frozen at mount regardless: `useEditor` only ever recreates the editor
   * when its own `deps` change, and those are empty. The effects further down
   * are what keep the live view in step with a prop that changes afterwards.
   */
  const editorProps = useMemo<EditorProps>(
    () => ({
      /*
       * The only DOM attributes this editor sets on the editable element.
       * Tiptap merges this with its own `role="textbox"` rather than replacing
       * it, so adding to this object is safe — replacing `editorProps` whole
       * later on would not be.
       *
       * `'true'`, not the absence of the attribute, for the default: an
       * explicit value is what makes the OFF case reachable at all, and a
       * contenteditable with no `spellcheck` already behaves as `true`.
       */
      attributes: {
        spellcheck: spellCheck ? 'true' : 'false',
        // So the surface carries them from its first paint. `aria-invalid` and
        // `aria-describedby` change every time the field's validation does,
        // and the effect below is what keeps them current.
        ...surfaceAttributes,
      },

      /**
       * Pasted content lands in THIS document's format. See
       * `paste-presentation.ts` for what "presentation" covers and why the
       * cleanup has to happen before ProseMirror parses rather than after.
       */
      transformPastedHTML(html) {
        return stripPastedPresentation(html);
      },

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
    }),
    [spellCheck, surfaceAttributes, uploadImage]
  );

  /*
   * Memoised for the identity reason above, and for a second one: this factory
   * allocates ~25 configured extension clones every time it runs, and it used
   * to run on every render — a full set of garbage per keystroke, for a list
   * `useEditor` freezes at mount and never looks at again.
   */
  const extensions = useMemo(
    () => [
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
            DebouncedTableOfContents.configure({
              getIndex: getHierarchicalIndexes,
              onUpdate(content) {
                // Only when something can read it. `items` feeds the outline
                // aside, which `chromeless` does not render — and the notes
                // workspace, the one surface where documents get long enough
                // for this to matter, is chromeless. Calling it there is a
                // state update that renders nothing and re-renders the whole
                // editor for it.
                if (!chromeless) setItems(content);
                outlineContentRef.current = content;
                reportOutline();
                // The heading elements may not be the same ones as a moment
                // ago — one was added, removed, or had its id stamped on it.
                observeHeadingsRef.current?.();
              },
            }),
          ]),
    ],
    [
      chromeless,
      compact,
      handleLinkTrigger,
      onLinkTrigger,
      placeholder,
      reportOutline,
      uploadImage,
      withMath,
    ]
  ) as Extension[];

  const editor = useEditor({
    immediatelyRender: false,
    // Tiptap 3 stops re-rendering on transactions by default, which leaves
    // every toolbar reading stale `isActive`/`can()`/`getAttributes` state.
    shouldRerenderOnTransaction: true,
    editorProps,
    extensions,
    content: value,
    onUpdate: ({ editor }) => {
      // Tiptap fires `update` for exactly the doc-changing transactions the
      // table-of-contents extension used to rebuild itself from, so this is
      // where the debounced rebuild is armed. Guarded on `compact` because
      // that is the case where the extension — and with it the command the
      // timer calls — is not registered at all.
      if (!compact) scheduleOutlineRebuild();

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

  // Re-applied to the LIVE view, because `editorProps` above is effectively
  // frozen at the value the editor mounted with: `useEditor` keeps its options
  // on a ref, never recreates the editor (its `deps` are empty), and only
  // reaches for `setOptions` when it notices an option whose identity changed —
  // which, now that `editorProps` is memoised, is exactly what does NOT happen
  // on an ordinary render. So a consumer flipping this setting would see
  // nothing happen until something else remounted the editor.
  //
  // Written straight onto the editable element rather than through
  // `editor.setOptions({ editorProps })`, which shallow-merges: passing an
  // `editorProps` object would replace the one holding `handleDrop` and
  // `handlePaste`, and the attributes ProseMirror recomputes from it would
  // drop the `role="textbox"` Tiptap adds inside `createView`. A direct write
  // survives, because ProseMirror only removes attributes that were in its own
  // previously computed set.
  useEffect(() => {
    const dom = editor?.view?.dom;
    if (!dom) return;
    dom.setAttribute('spellcheck', spellCheck ? 'true' : 'false');
  }, [editor, spellCheck]);

  // The same direct write the spellcheck effect above uses, and kept for the
  // same reason: whether a change to `editorProps` reaches the live view is
  // Tiptap's business, not this component's, and a label pointing at a stale
  // `aria-invalid` is not a failure mode worth leaving to that. Writing the
  // attribute is idempotent, so this costs nothing when the props already made
  // it through.
  const appliedSurfaceAttrsRef = useRef<string[]>([]);
  useEffect(() => {
    const dom = editor?.view?.dom;
    if (!dom) return;

    // Only clears what THIS component wrote: Tiptap puts its own
    // `role="textbox"` on the same element, and removing that would leave the
    // surface with no accessible role at all.
    for (const attribute of appliedSurfaceAttrsRef.current) {
      if (!(attribute in surfaceAttributes)) dom.removeAttribute(attribute);
    }
    for (const [attribute, attributeValue] of Object.entries(
      surfaceAttributes
    )) {
      dom.setAttribute(attribute, attributeValue);
    }
    appliedSurfaceAttrsRef.current = Object.keys(surfaceAttributes);
  }, [editor, surfaceAttributes]);

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

  // The pane's text, readable from a STABLE callback. `formatMarkdown` below
  // is published on the consumer-facing api, which is handed over in an effect
  // — depending on `rawText` directly would republish (and revoke) that api on
  // every keystroke in raw mode.
  const rawTextRef = useRef<string | null>(null);
  rawTextRef.current = rawText;

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

  const rawTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  /*
   * Keeping the author's place across the WYSIWYG ↔ markdown toggle.
   *
   * Both views live in ONE scroll container (the `overflow-y-auto` div below),
   * so `scrollTop` survives the switch untranslated and lands somewhere else
   * entirely — a table that is 800px of rendered editor is forty lines of
   * source. The block index is the unit the two representations share; see
   * `mode-switch-anchor.ts`, and `markdown-anchor.ts` for why it cannot be
   * finer than a block.
   *
   * Captured inside the mode effect, which runs while the OUTGOING view is
   * still mounted (`rawActive` needs both `markdownMode` and `rawText`, and
   * the effect is what sets the second), then served by the layout effect
   * below once the incoming one has painted.
   */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingLineRef = useRef<number | null>(null);
  const anchorMapRef = useRef<MarkdownAnchorMap | null>(null);

  /*
   * Where the raw pane is, tracked as it moves rather than read on the way
   * out.
   *
   * Reading it during the exit is what the first attempt did, and it cannot
   * work: `rawActive` is `markdownMode && rawText !== null`, so the moment the
   * prop flips the textarea unmounts IN THAT SAME RENDER — before any effect
   * runs, and layout effects run before passive ones. By the time the mode
   * effect looked, `rawTextareaRef.current` was null and every switch reported
   * line 0, which is why the editor kept landing at the top of the document.
   */
  const markdownLineRef = useRef(0);
  /*
   * Coalesced to one read per FRAME, because this is a `scroll` handler and the
   * browser dispatches those far more often than it paints — a trackpad flick
   * over a long note fires dozens between two frames, and every one of them was
   * doing the whole measurement for a position that was about to be replaced by
   * the next.
   *
   * `requestAnimationFrame`, specifically, and not `passive: true`: passive
   * listeners only ever mattered for `wheel` and `touchstart`, where the
   * browser must otherwise wait to learn whether the handler will call
   * `preventDefault`. A `scroll` event is not cancellable at all, so the flag
   * would have bought exactly nothing here — coalescing is what actually stops
   * the work.
   *
   * A frame late is not late: the only reader of `markdownLineRef` is the mode
   * toggle, and if a pending frame is dropped by the unmount below, the value
   * is at worst one frame's scrolling stale.
   */
  const markdownFrameRef = useRef<number | null>(null);
  const noteMarkdownPosition = useCallback(() => {
    if (markdownFrameRef.current !== null) return;
    markdownFrameRef.current = requestAnimationFrame(() => {
      markdownFrameRef.current = null;
      const textarea = rawTextareaRef.current;
      if (textarea) {
        markdownLineRef.current = readTextareaLine(
          textarea,
          scrollRef.current,
          anchorMapRef.current
        );
      }
    });
  }, []);

  useEffect(
    () => () => {
      if (markdownFrameRef.current !== null) {
        cancelAnimationFrame(markdownFrameRef.current);
      }
    },
    []
  );
  // Where the caret has to land after a formatted paste. The textarea is
  // CONTROLLED, so React assigns `value` on the render that follows
  // `applyRaw` — and assigning `value` collapses the selection to the end of
  // the text. Without this, pasting into the middle of a long note throws the
  // author to the bottom of the pane on every paste.
  const pendingCaretRef = useRef<number | null>(null);

  // Layout, not passive: the restore has to happen in the same frame as the
  // assignment that moved it, or the caret is visibly at the wrong end for a
  // paint. No dependency array — the request is one-shot and cleared as it is
  // served, so the cost of running is a null check.
  useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    if (caret === null) return;
    pendingCaretRef.current = null;
    rawTextareaRef.current?.setSelectionRange(caret, caret);
  });

  // Declared here rather than beside the render below, because the layout
  // effect that follows needs it and hooks cannot sit after `if (!editor)`.
  const rawActive = markdownMode && rawText !== null;

  /*
   * Serves whichever anchor the mode effect left behind, once the incoming
   * view has painted.
   *
   * Layout, not passive, and for the same reason the caret restore above is:
   * the scroll has to be corrected in the frame the new view first appears in,
   * or the author watches it jump.
   */
  useLayoutEffect(() => {
    if (!rawActive) return;

    const line = pendingLineRef.current;
    const textarea = rawTextareaRef.current;
    const map = anchorMapRef.current;
    if (line === null || !textarea || !map) return;

    pendingLineRef.current = null;
    applyTextareaLine(textarea, scrollRef.current, map, line);
    markdownLineRef.current = line;
  }, [rawActive]);

  /*
   * Which heading the reader is under — worked out here, because the ToC
   * extension cannot.
   *
   * `@tiptap/extension-table-of-contents` derives `isActive` inside a `scroll`
   * listener it attaches to its `scrollParent`, and that option defaults to
   * `() => window`. Nothing in this editor scrolls the window: the document
   * scrolls the `overflow-y-auto` column below (`scrollRef`), inside a page
   * that is itself full height. So the listener never fired once, the
   * extension's `scrollPosition` stayed 0, and every item came back
   * `isActive: false` — verified on the live site by scrolling a note to
   * "4.3 Family 3 — DETR and set prediction" and watching the Contents panel
   * highlight nothing and follow nothing. On a 66-heading note that panel is
   * the only thing that says where you are.
   *
   * Pointing `scrollParent` at the column would fix the wiring and hand back
   * the cost `DebouncedTableOfContents` above exists to remove: that listener
   * runs `addTocActiveStatesAndGetItems`, which is a full `doc.descendants`
   * walk plus a `domAtPos(...).offsetTop` read PER HEADING, unthrottled — the
   * same forced layout as before, moved from once per keystroke to once per
   * scroll event.
   *
   * An IntersectionObserver answers the same question for nothing per frame:
   * the browser computes intersections itself and calls back only when one
   * changes, which for someone reading is once per heading crossed rather than
   * once per pixel travelled.
   *
   * What is observed is the region ABOVE the top edge of the scroll column —
   * `rootMargin` collapses the root onto that edge and then extends it upwards
   * — so "intersecting" means precisely "this heading's top has passed the top
   * of the viewport", and the active heading is the LAST one that is. Making
   * the two identical is what makes the state safe to accumulate across
   * callbacks: a heading can only change side by crossing that edge, and
   * crossing it always changes `isIntersecting`, so no transition can be
   * missed. A thin band at the top would look equivalent and is not — one fast
   * flick, or one click on an outline entry, jumps a heading clean over the
   * band with no callback either side, and the panel goes on highlighting the
   * section the reader left.
   */
  useEffect(() => {
    const root = scrollRef.current;
    // Nothing to be active in: `compact` never registers the extension, and
    // both the raw pane and the preview `hidden` the writing surface, where
    // every heading measures 0×0 and would answer about a layout nobody sees.
    if (compact || rawActive || preview !== null || !editor || !root) return;

    const surface = editor.view.dom;
    // Document order — `querySelectorAll` guarantees it — so "the last one
    // passed" is a scan back from the end.
    let headings: HTMLElement[] = [];
    const passed = new Set<Element>();

    const publishActive = () => {
      let active: string | null = null;
      for (let index = headings.length - 1; index >= 0; index -= 1) {
        if (passed.has(headings[index])) {
          active = headings[index].dataset.tocId ?? null;
          break;
        }
      }

      // Stays null above the first heading — at the top of a document that
      // opens with a paragraph, no section is the one being read, and the
      // panel is right to highlight nothing.
      if (active === activeHeadingIdRef.current) return;
      activeHeadingIdRef.current = active;
      // Guarded like `setItems` in `onUpdate`, and for the same reason: the
      // aside this state feeds is not rendered when the consumer brings its
      // own panel, so setting it there is a render nobody reads.
      if (!chromeless) setActiveHeadingId(active);
      reportOutline();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) passed.add(entry.target);
          else passed.delete(entry.target);
        }
        publishActive();
      },
      {
        root,
        rootMargin: `${ABOVE_VIEWPORT_PX}px 0px -100% 0px`,
        threshold: 0,
      }
    );

    const observe = () => {
      observer.disconnect();
      // Re-seeded rather than kept: `observe` delivers an initial callback for
      // every element, so the set refills from scratch — and an element that
      // has left the document must not be left in it holding a vote.
      passed.clear();
      headings = [...surface.querySelectorAll<HTMLElement>('[data-toc-id]')];
      for (const heading of headings) observer.observe(heading);
    };

    // Usually finds nothing on this first pass: the ids are stamped by a
    // transaction the extension dispatches from its own `onCreate`, a
    // macrotask after this effect runs. `onUpdate` re-runs it once they exist.
    observeHeadingsRef.current = observe;
    observe();

    return () => {
      observeHeadingsRef.current = null;
      observer.disconnect();
    };
  }, [chromeless, compact, editor, preview, rawActive, reportOutline]);

  /**
   * A paste into the raw-markdown pane, formatted before it lands.
   *
   * Only the pasted FRAGMENT goes through the formatter, spliced into the
   * pane's text at the selection. Running the formatter over the whole pane
   * instead would be far simpler and is the wrong contract: it would rewrite
   * lines the author typed by hand, at a moment they were not thinking about
   * formatting at all.
   *
   * With no `text/plain` on the clipboard — a file, an image, an HTML-only
   * fragment — this does nothing and the browser's own paste runs, which is
   * the only handler that knows what to do with any of those.
   */
  const handleRawPaste = useCallback(
    (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
      if (!formatMarkdownOnPaste) return;

      const pasted = event.clipboardData.getData('text/plain');
      if (pasted === '') return;

      const { selectionStart, selectionEnd, value } = event.currentTarget;
      const formatted = formatMarkdown(pasted);
      // `formatMarkdown` terminates its output with exactly one newline,
      // because it formats DOCUMENTS. A fragment pasted into the middle of a
      // sentence is not a document, and that newline would break the line the
      // author pasted into — so it is kept only when the clipboard text
      // carried one of its own.
      const insert = pasted.endsWith('\n')
        ? formatted
        : formatted.replace(/\n$/, '');

      event.preventDefault();
      pendingCaretRef.current = selectionStart + insert.length;
      applyRaw(
        `${value.slice(0, selectionStart)}${insert}${value.slice(selectionEnd)}`
      );
    },
    [applyRaw, formatMarkdownOnPaste]
  );

  // Read through a ref, and NOT listed in the effect's deps below. That effect
  // re-serializes the document into the pane whenever it runs with
  // `markdownMode` on, so depending on this prop would mean that toggling the
  // setting mid-edit replaces the author's uncommitted raw text with a
  // serialization of the document as it stood up to 800ms ago — precisely the
  // edit loss `pendingRawRef` exists to prevent.
  const formatOnExitRef = useRef(formatMarkdownOnExit);
  formatOnExitRef.current = formatMarkdownOnExit;

  // Entering raw mode serializes the CURRENT document; leaving it flushes any
  // pending raw edit and reveals the editor again.
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    if (markdownMode) {
      const markdown = currentEditor.getMarkdown();
      const map = anchorMapFor(currentEditor, markdown);
      anchorMapRef.current = map;
      pendingLineRef.current =
        map.startLine[readEditorBlock(currentEditor, scrollRef.current)] ?? 0;
      setRawText(markdown);
    } else {
      /*
       * Format BEFORE the flush, by rewriting the buffer `flushRaw` is about
       * to read. Formatting after it would parse the unformatted text into the
       * document first and then have nothing left to act on; formatting a copy
       * would drop whatever the author typed in the last 800ms.
       *
       * Which text: the pending buffer if there is one, otherwise the pane's
       * committed text. Falling back matters — whether a debounce happened to
       * have fired before the toggle is a race, and a formatter that runs or
       * does not run depending on how fast the author clicked is one nobody
       * trusts.
       *
       * The `pending === null && formatted === committed` case is left alone
       * on purpose: the document already holds that text, so committing it
       * again would be a doc transaction, an `onChange`, and an autosave write
       * for a document that did not change. `formatMarkdown` is idempotent, so
       * this comparison is a real answer rather than an optimisation.
       */
      if (formatOnExitRef.current) {
        const pending = pendingRawRef.current;
        const source = pending ?? rawTextRef.current;
        if (source !== null) {
          const formatted = formatMarkdown(source);
          if (pending !== null || formatted !== rawTextRef.current) {
            pendingRawRef.current = formatted;
          }
        }
      }
      // The text the flush is about to commit — read after the format block
      // above, which may have rewritten it.
      const text = pendingRawRef.current ?? rawTextRef.current;
      const line = markdownLineRef.current;

      flushRaw();
      setRawText(null);

      /*
       * Applied here rather than through a pending ref and a layout effect:
       * the WYSIWYG surface is already visible by now (it is only `hidden`
       * while `rawActive`, which went false in the render that scheduled this
       * effect), layout is committed, and ProseMirror has applied the flush
       * synchronously — so the document and its DOM are both the ones being
       * measured.
       *
       * Mapped against the document the flush just produced, not the one that
       * was there when the pane opened: the author may have rewritten half of
       * it, and a map built on entry would name blocks that no longer exist.
       */
      if (text !== null) {
        const map = anchorMapFor(currentEditor, text);
        anchorMapRef.current = map;
        applyEditorBlock(
          currentEditor,
          scrollRef.current,
          blockAtLine(map, line)
        );
      }
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

  const formatRaw = useCallback((): FormatMarkdownResult => {
    // The PENDING buffer wins over committed state: an author who pastes and
    // immediately hits Format is inside the 800ms debounce, and the paste is
    // precisely the text they want tidied.
    const current = pendingRawRef.current ?? rawTextRef.current;
    if (current === null) return 'unavailable';

    const next = formatMarkdown(current);
    if (next === current) return 'unchanged';

    applyRaw(next);
    return 'formatted';
  }, [applyRaw]);

  useEffect(() => {
    if (!editor) return;
    const api: RichTextEditorApi = {
      getMarkdown: () => {
        flushRaw();
        return editor.getMarkdown();
      },
      formatMarkdown: formatRaw,
      insertLink,
      editor,
    };
    onEditorApiRef.current?.(api);
    return () => onEditorApiRef.current?.(null);
  }, [editor, flushRaw, formatRaw, insertLink]);

  if (!editor) return null;

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
          ref={scrollRef}
          // The raw pane does not scroll — this column does — so the pane's
          // position is read from here. See `markdownLineRef`.
          onScroll={rawActive ? noteMarkdownPosition : undefined}
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
              ref={rawTextareaRef}
              value={rawText ?? ''}
              onChange={(event) => applyRaw(event.target.value)}
              // Always attached; the handler returns immediately when the
              // option is off, which leaves the browser's own paste in place
              // rather than a re-implementation of it.
              onPaste={handleRawPaste}
              // The caret is the anchor whenever it is on screen, so every way
              // it can move has to keep the tracker current.
              onSelect={noteMarkdownPosition}
              onKeyUp={noteMarkdownPosition}
              spellCheck={spellCheck}
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
                      // Not `item.isActive` — see the observer effect above
                      // for why the extension's own flag is always false here.
                      item.id === activeHeadingId && 'text-primary border-primary',
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
