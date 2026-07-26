import type { ReferenceItem } from './types';

const SENTENCE_END = /[.!?]$/;

/**
 * Renders an entry as `Authors (Year). Title. Source.` — the URL is rendered
 * separately so it can stay a real link in both the editor and the article.
 * Shared by the node view and `renderHTML` so the two never drift apart.
 */
export function formatReferenceText(item: ReferenceItem): string {
  const parts: string[] = [];

  if (item.authors) {
    parts.push(item.year ? `${item.authors} (${item.year})` : item.authors);
  } else if (item.year) {
    parts.push(`(${item.year})`);
  }

  if (item.title) parts.push(item.title);
  if (item.source) parts.push(item.source);

  const text = parts.join('. ');
  if (!text) return '';

  return SENTENCE_END.test(text) ? text : `${text}.`;
}

/** Short label for lists where the full citation would be too long. */
export function formatReferenceLabel(item: ReferenceItem): string {
  return item.title || item.url || item.source || item.authors || 'Untitled';
}
