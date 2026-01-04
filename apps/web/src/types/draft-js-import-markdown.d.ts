declare module 'draft-js-import-markdown' {
  import { ContentState } from 'draft-js';

  export function stateFromMarkdown(
    markdown: string,
    options?: any
  ): ContentState;
}
