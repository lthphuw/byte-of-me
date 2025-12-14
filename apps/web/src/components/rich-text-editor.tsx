import * as React from 'react';
import { useMemo } from 'react';
import { Editor, EditorState, RichUtils } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
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

  const handleKeyCommand = (
    command: string,
    state: EditorState
  ) => {
    const newState = RichUtils.handleKeyCommand(state, command);
    if (newState) {
      onChange(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const cleanHtml = useMemo(() => {
    const contentState = editorState.getCurrentContent();

    if (!contentState.hasText()) return;

    const html = stateToHTML(contentState);
    return DOMPurify.sanitize(html);
  }, [editorState]);


  return (
    <div className="border rounded-md p-2">
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
         <CopyButton className={'ml-auto flex self-center'} content={cleanHtml || ''} />
      </div>

      <Editor
        ref={editorRef}
        editorState={editorState}
        onChange={onChange}
        handleKeyCommand={handleKeyCommand}
        placeholder={placeholder}
      />
    </div>
  );
}
