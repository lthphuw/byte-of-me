import { Editor, EditorState, RichUtils } from 'draft-js';

import { Button } from '@/components/ui/button';





export interface RichTextEditorProps {
  editorState: EditorState;
  onChange: (newState: EditorState) => void;
  handleKeyCommand: (
    command: string,
    state: EditorState
  ) => 'handled' | 'not-handled';
  keyBindingFn: (e: React.KeyboardEvent) => string | null;
  placeholder?: string;
  editorRef?: React.RefObject<Editor | null>;
  toolbarConfig?: string[]; // To customize toolbar buttons
}

export function RichTextEditor({
  editorState,
  onChange,
  handleKeyCommand,
  keyBindingFn,
  placeholder,
  editorRef,
  toolbarConfig = ['H1', 'H2', 'UL', 'OL', 'Bold', 'Italic', 'Underline'],
}: RichTextEditorProps) {
  const toggleBlockType = (blockType: string) => {
    onChange(RichUtils.toggleBlockType(editorState, blockType));
  };

  const toggleInlineStyle = (inlineStyle: string) => {
    onChange(RichUtils.toggleInlineStyle(editorState, inlineStyle));
  };

  return (
    <div className="border rounded-md p-2">
      <div className="flex space-x-2 mb-2">
        {toolbarConfig.includes('H1') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleBlockType('header-one')}
          >
            H1
          </Button>
        )}
        {toolbarConfig.includes('H2') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleBlockType('header-two')}
          >
            H2
          </Button>
        )}
        {toolbarConfig.includes('H3') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleBlockType('header-three')}
          >
            H3
          </Button>
        )}
        {toolbarConfig.includes('UL') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleBlockType('unordered-list-item')}
          >
            UL
          </Button>
        )}
        {toolbarConfig.includes('OL') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleBlockType('ordered-list-item')}
          >
            OL
          </Button>
        )}
        {toolbarConfig.includes('Bold') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleInlineStyle('BOLD')}
          >
            Bold
          </Button>
        )}
        {toolbarConfig.includes('Italic') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleInlineStyle('ITALIC')}
          >
            Italic
          </Button>
        )}
        {toolbarConfig.includes('Underline') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleInlineStyle('UNDERLINE')}
          >
            Underline
          </Button>
        )}
      </div>
      <Editor
        ref={editorRef}
        editorState={editorState}
        onChange={onChange}
        handleKeyCommand={handleKeyCommand}
        keyBindingFn={keyBindingFn}
        placeholder={placeholder}
      />
    </div>
  );
}
