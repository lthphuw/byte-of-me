import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'bun:test';

import { testEditorLabels } from './editor-labels.test-fixture';
import { RichTextEditor } from './rich-text-editor';

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
