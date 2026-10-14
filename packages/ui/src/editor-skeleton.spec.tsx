import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'bun:test';

import { testEditorLabels } from './rich-text-editor/tiptap/editor-labels.test-fixture';
import { RichTextEditor } from './rich-text-editor/tiptap/rich-text-editor';
import { EditorSkeleton } from './editor-skeleton';

describe('EditorSkeleton', () => {
  it('reserves the body height a compact editor will take', () => {
    const html = renderToString(<EditorSkeleton compact minHeight={140} />);

    expect(html).toContain('min-height:140px');
  });

  it('defaults a compact body to the same 160px floor as the editor', () => {
    expect(renderToString(<EditorSkeleton compact />)).toContain(
      'min-height:160px'
    );
  });

  it('is the full editor height otherwise', () => {
    expect(renderToString(<EditorSkeleton />)).toContain('min(720px,62dvh)');
  });
});

describe('RichTextEditor before its editor exists', () => {
  it('draws the skeleton, never nothing, so the field does not pop in', () => {
    const html = renderToString(
      <RichTextEditor
        compact
        minHeight={140}
        uploadFailedText="Upload failed"
        labels={testEditorLabels}
      />
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('min-height:140px');
  });
});
