/**
 * The invariant `render-extensions.ts` states: whatever the editor can store, the
 * published page can draw, with the same names, or `generateHTML` throws and the
 * content falls back to escaped text. Compared as schemas, not as lists.
 */
import {
  renderExtensions,
  sharedExtensions,
} from '@byte-of-me/rich-text-schema';
import { getSchema } from '@tiptap/core';
import { describe, expect, it } from 'bun:test';

import { createExtensions } from './create-extensions';
import { testEditorLabels } from './editor-labels.test-fixture';

const editorSchema = getSchema(
  createExtensions({ uploadFailedText: 'x', labels: testEditorLabels })
);
const renderSchema = getSchema(renderExtensions);

const nodeNames = (schema: typeof editorSchema) => Object.keys(schema.nodes);
const markNames = (schema: typeof editorSchema) => Object.keys(schema.marks);

describe('editor and render schemas', () => {
  it('draw every node the editor can store', () => {
    for (const name of nodeNames(editorSchema)) {
      expect(nodeNames(renderSchema)).toContain(name);
    }
  });

  it('draw every mark the editor can store', () => {
    for (const name of markNames(editorSchema)) {
      expect(markNames(renderSchema)).toContain(name);
    }
  });

  it('give each node the same attributes in both', () => {
    for (const name of nodeNames(editorSchema)) {
      const stored = Object.keys(editorSchema.nodes[name].spec.attrs ?? {});
      const drawn = Object.keys(renderSchema.nodes[name].spec.attrs ?? {});
      // The render side may carry more (the numeric-column flag is set at render
      // time and never stored); it may never carry fewer.
      for (const attribute of stored) expect(drawn).toContain(attribute);
    }
  });
});

describe('sharedExtensions', () => {
  it('starts both lists, so the text, heading, code and mark rules cannot drift', () => {
    const editor = createExtensions({
      uploadFailedText: 'x',
      labels: testEditorLabels,
    });

    sharedExtensions.forEach((extension, index) => {
      expect(editor[index]).toBe(extension);
      expect(renderExtensions[index]).toBe(extension);
    });
  });
});
