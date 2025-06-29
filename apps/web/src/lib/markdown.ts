import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { slugify } from './slugify';

export interface TocItem {
  id: string;
  depth: number;
  text: string;
}

export function extractToc(markdown: string): TocItem[] {
  const toc: TocItem[] = [];

  const tree = unified().use(remarkParse).parse(markdown);

  visit(tree, 'heading', (node: any) => {
    const depth = node.depth;
    const text = node.children
      .filter((child: any) => child.type === 'text')
      .map((child: any) => child.value)
      .join(' ');
    const id = slugify(text);
    toc.push({ id, depth, text });
  });

  return toc;
}
