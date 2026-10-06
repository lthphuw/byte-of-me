import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { ArticleHeadingsProvider } from './article-headings-context';

import { BlogReaderNav } from '@/widgets/public/blog-details-content/ui/blog-reader-nav';
import { BlogTableOfContents } from '@/widgets/public/blog-details-content/ui/blog-table-of-contents';

const RealIntersectionObserver = globalThis.IntersectionObserver;
let observersCreated = 0;

class CountingIntersectionObserver extends RealIntersectionObserver {
  constructor(...args: ConstructorParameters<typeof IntersectionObserver>) {
    super(...args);
    observersCreated += 1;
  }
}

beforeEach(() => {
  observersCreated = 0;
  globalThis.IntersectionObserver = CountingIntersectionObserver;
});

afterEach(() => {
  cleanup();
  globalThis.IntersectionObserver = RealIntersectionObserver;
});

describe('ArticleHeadingsProvider', () => {
  it('watches the headings once for the rail and the corner button together', () => {
    render(
      <ArticleHeadingsProvider targetId="article">
        <div id="article">
          <h2>Setup</h2>
          <h3>Install</h3>
          <h2>Usage</h2>
        </div>
        <BlogTableOfContents label="Contents" />
        <BlogReaderNav
          targetId="article"
          contentsLabel="Open contents"
          referencesLabel="References"
        />
      </ArticleHeadingsProvider>
    );

    // Both consumers got the headings...
    expect(screen.getByRole('navigation', { name: 'Contents' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Open contents' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Install' }).getAttribute('href')).toBe(
      '#install'
    );
    // ...from a single observer, not one each.
    expect(observersCreated).toBe(1);
  });
});
