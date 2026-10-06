'use client';

import { createContext, useContext } from 'react';

import { useArticleHeadings } from '@/widgets/public/blog-details-content/lib/use-article-navigation';

type ArticleHeadingsState = ReturnType<typeof useArticleHeadings>;

const ArticleHeadingsContext = createContext<ArticleHeadingsState | null>(null);

/**
 * One heading scan and IntersectionObserver for the rail and the corner button,
 * which sit apart in the tree. Children are server-rendered, so only those two
 * consumers re-render when the active heading changes.
 */
export function ArticleHeadingsProvider({
  targetId,
  children,
}: {
  targetId: string;
  children: React.ReactNode;
}) {
  const value = useArticleHeadings(targetId);

  return (
    <ArticleHeadingsContext.Provider value={value}>
      {children}
    </ArticleHeadingsContext.Provider>
  );
}

export function useSharedArticleHeadings(): ArticleHeadingsState {
  const context = useContext(ArticleHeadingsContext);

  if (!context) {
    throw new Error(
      'useSharedArticleHeadings must be used within <ArticleHeadingsProvider>'
    );
  }

  return context;
}
