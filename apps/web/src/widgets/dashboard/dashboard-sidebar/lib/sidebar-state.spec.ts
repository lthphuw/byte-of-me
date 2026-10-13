import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';

import {
  isSidebarExpanded,
  persistSidebarExpanded,
  SIDEBAR_COOKIE,
} from './sidebar-state';

function storedValue(): string | undefined {
  const pair = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${SIDEBAR_COOKIE}=`));
  return pair?.slice(SIDEBAR_COOKIE.length + 1);
}

describe('isSidebarExpanded', () => {
  it('expands when no preference is stored', () => {
    expect(isSidebarExpanded(undefined)).toBe(true);
  });

  it('collapses only for the collapsed preference', () => {
    expect(isSidebarExpanded('collapsed')).toBe(false);
    expect(isSidebarExpanded('expanded')).toBe(true);
    expect(isSidebarExpanded('garbage')).toBe(true);
  });
});

describe('persistSidebarExpanded', () => {
  // happy-dom starts on about:blank, where a cookie write is silently dropped.
  // The URL is set here only and restored after, so no other spec sees it.
  const { happyDOM } = window as unknown as {
    happyDOM: { setURL(url: string): void };
  };
  let previousUrl = '';

  beforeAll(() => {
    previousUrl = document.URL;
    happyDOM.setURL('http://localhost/');
  });

  afterAll(() => {
    happyDOM.setURL(previousUrl);
  });

  afterEach(() => {
    document.cookie = `${SIDEBAR_COOKIE}=; path=/; max-age=0`;
  });

  it('writes a value that the server reads back as the same state', () => {
    persistSidebarExpanded(false);
    expect(isSidebarExpanded(storedValue())).toBe(false);
    persistSidebarExpanded(true);
    expect(isSidebarExpanded(storedValue())).toBe(true);
  });
});
