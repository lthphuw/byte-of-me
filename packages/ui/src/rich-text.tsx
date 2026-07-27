// Deliberately NOT a client component. It has no state, effects or handlers —
// it turns a stored Tiptap document into HTML and prints it. Keeping it on the
// server is what stops `generateHTML` and the whole extension schema
// (tiptap + prosemirror + lowlight ≈ 1 MB) from being shipped to visitors.
// A client component that needs rendered rich text should take it as
// `children` from a server parent — or, where the data arrives through a
// server action (the projects timeline), receive HTML pre-rendered with
// `renderRichTextHtml` and print it with `RichTextHtml`.
import * as React from 'react';

import { RichTextHtml, type RichTextHtmlProps } from './rich-text-html';
// Direct path into a directive-free module — NOT `./rich-text-editor`, whose
// entry is a 'use client' file. Importing the schema from there registers the
// whole editor as a client reference and ships it (~380 KB) with every page
// that renders rich text.
import { renderRichTextHtml } from './rich-text-render';

export type RichTextProps = Omit<RichTextHtmlProps, 'html'> & {
  content?: string | unknown;
};

export function RichText({ content, ...rest }: RichTextProps) {
  if (!content) return null;

  return <RichTextHtml html={renderRichTextHtml(content)} {...rest} />;
}
