import * as React from 'react';
import { useMemo } from 'react';
import { Editor, EditorState, RichUtils } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromMarkdown } from 'draft-js-import-markdown';
import DOMPurify from 'isomorphic-dompurify';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/copy-button';





type ToolbarItem =
  | 'H1'
  | 'H2'
  | 'H3'
  | 'UL'
  | 'OL'
  | 'Bold'
  | 'Italic'
  | 'Underline';

const DEFAULT_TOOLBAR: ToolbarItem[] = [
  'H1',
  'H2',
  'H3',
  'UL',
  'OL',
  'Bold',
  'Italic',
  'Underline',
];

export interface RichTextEditorProps {
  editorState: EditorState;
  onChange: (state: EditorState) => void;
  placeholder?: string;
  editorRef?: React.RefObject<Editor | null>;
  toolbarConfig?: ToolbarItem[];
}

/**
 * Detect markdown content
 */
function isMarkdown(text: string) {
  return (
    /^#{1,6}\s/m.test(text) ||        // headings
    /^(-|\*|\+)\s/m.test(text) ||     // ul
    /^\d+\.\s/m.test(text) ||         // ol
    /\*\*.+?\*\*/.test(text) ||       // bold
    /_.+?_/.test(text) ||             // italic
    /```/.test(text)                  // code block
  );
}

export function RichTextEditor({
                                 editorState,
                                 onChange,
                                 placeholder,
                                 editorRef,
                                 toolbarConfig = DEFAULT_TOOLBAR,
                               }: RichTextEditorProps) {
  const toggleBlockType = (blockType: string) => {
    onChange(RichUtils.toggleBlockType(editorState, blockType));
  };

  const toggleInlineStyle = (style: string) => {
    onChange(RichUtils.toggleInlineStyle(editorState, style));
  };

  const handleKeyCommand = (command: string, state: EditorState) => {
    const newState = RichUtils.handleKeyCommand(state, command);
    if (newState) {
      onChange(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  /**
   * Handle paste markdown
   */
  const handlePastedText = (
    text: string,
    _html: string | undefined,
    state: EditorState
  ) => {
    if (!isMarkdown(text)) {
      return 'not-handled';
    }

    try {
      const contentFromMd = stateFromMarkdown(text);

      const newEditorState = EditorState.push(
        state,
        contentFromMd,
        'insert-fragment'
      );

      onChange(
        EditorState.forceSelection(
          newEditorState,
          contentFromMd.getSelectionAfter()
        )
      );

      return 'handled';
    } catch (err) {
      console.error('Markdown paste error:', err);
      return 'not-handled';
    }
  };

  const cleanHtml = useMemo(() => {
    const contentState = editorState.getCurrentContent();
    if (!contentState.hasText()) return '';
    return DOMPurify.sanitize(stateToHTML(contentState));
  }, [editorState]);

  return (
    <div className="border rounded-md p-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {toolbarConfig.includes('H1') && (
          <Button size="sm" variant="outline" onClick={() => toggleBlockType('header-one')}>
            H1
          </Button>
        )}

        {toolbarConfig.includes('H2') && (
          <Button size="sm" variant="outline" onClick={() => toggleBlockType('header-two')}>
            H2
          </Button>
        )}

        {toolbarConfig.includes('H3') && (
          <Button size="sm" variant="outline" onClick={() => toggleBlockType('header-three')}>
            H3
          </Button>
        )}

        {toolbarConfig.includes('UL') && (
          <Button size="sm" variant="outline" onClick={() => toggleBlockType('unordered-list-item')}>
            UL
          </Button>
        )}

        {toolbarConfig.includes('OL') && (
          <Button size="sm" variant="outline" onClick={() => toggleBlockType('ordered-list-item')}>
            OL
          </Button>
        )}

        {toolbarConfig.includes('Bold') && (
          <Button size="sm" variant="outline" onClick={() => toggleInlineStyle('BOLD')}>
            Bold
          </Button>
        )}

        {toolbarConfig.includes('Italic') && (
          <Button size="sm" variant="outline" onClick={() => toggleInlineStyle('ITALIC')}>
            Italic
          </Button>
        )}

        {toolbarConfig.includes('Underline') && (
          <Button size="sm" variant="outline" onClick={() => toggleInlineStyle('UNDERLINE')}>
            Underline
          </Button>
        )}

        <CopyButton className="ml-auto" content={cleanHtml} />
      </div>

      {/* Editor */}
      <Editor
        ref={editorRef}
        editorState={editorState}
        onChange={onChange}
        handleKeyCommand={handleKeyCommand}
        handlePastedText={handlePastedText}
        placeholder={placeholder}
      />
    </div>
  );
}
