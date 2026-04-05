import { type Editor } from '@tiptap/core';

export const NODE_HANDLES_SELECTED_STYLE_CLASSNAME =
  'node-handles-selected-style';

export function isValidUrl(url: string) {
  return /^https?:\/\/\S+$/.test(url);
}

export const duplicateContent = (editor: Editor) => {
  const { view } = editor;
  const { state } = view;
  const { selection } = state;

  editor
    .chain()
    .insertContentAt(
      selection.to,
      /* eslint-disable */
      // @ts-nocheck
      selection.content().content.firstChild?.toJSON(),
      {
        updateSelection: true,
      }
    )
    .focus(selection.to)
    .run();
};

export function getUrlFromString(str: string) {
  if (isValidUrl(str)) {
    return str;
  }
  try {
    if (str.includes(".") && !str.includes(" ")) {
      return new URL(`https://${str}`).toString();
    }
  } catch {
    return null;
  }
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
}

export function getNestedHeadings(json: any) {
  const headings: { id: string; text: string; level: number }[] = [];

  if (json.content) {
    json.content.forEach((node: any) => {
      if (node.type === 'heading') {
        const text = node.content?.map((c: any) => c.text).join('') || '';
        // Create a slug if ID doesn't exist
        const id = node.attrs.id || text.toLowerCase().replace(/\s+/g, '-');

        headings.push({
          id,
          text,
          level: node.attrs.level,
        });
      }
    });
  }

  return headings;
}
