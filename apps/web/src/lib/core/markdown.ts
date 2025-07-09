/* eslint-disable @typescript-eslint/no-explicit-any */
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export interface TocItem {
  id: string;
  depth: number;
  text: string;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
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

export function resolveRelativeImages(
  markdown: string,
  githubUrl: string
): string {
  const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  const repo = match?.[1];

  if (!repo) return markdown;

  const baseURL = `https://raw.githubusercontent.com/${repo}/main/`;

  // Replace Markdown image: ![alt](relative/path.png)
  const mdImageReplaced = markdown.replace(
    /!\[([^\]]*)\]\(((?!https?:\/\/)[^)]+)\)/g,
    (_, alt, path) => {
      const cleanedPath = path.replace(/^\.?\/*/, '');
      return `![${alt}](${baseURL}${cleanedPath})`;
    }
  );

  // Replace HTML image: <img src="..." ...>
  const htmlImageReplaced = mdImageReplaced.replace(
    /<img([^>]+?)src=["']((?!https?:\/\/)[^"']+)["']/g,
    (_, attrs, src) => {
      const cleanedSrc = src.replace(/^\.?\/*/, '');
      return `<img${attrs}src="${baseURL}${cleanedSrc}"`;
    }
  );

  return htmlImageReplaced;
}
