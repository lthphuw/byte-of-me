import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../messages/en.json';

import { ManagerListState } from './manager-list-state';

afterEach(() => {
  cleanup();
});

function withIntl(node: ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>
  );
}

describe('ManagerListState', () => {
  it('renders the pager in the empty state', () => {
    render(
      withIntl(
        <ManagerListState
          isLoading={false}
          isEmpty
          emptyTitle="Nothing here yet"
          pagination={<p>Pager on an empty page</p>}
        >
          <p>row</p>
        </ManagerListState>
      )
    );

    expect(screen.queryByText('Pager on an empty page')).not.toBeNull();
  });

  it('renders one skeleton row for each of skeletonRows', () => {
    const { container } = render(
      withIntl(
        <ManagerListState
          isLoading
          isEmpty={false}
          emptyTitle="Nothing here yet"
          skeletonRows={3}
        >
          <p>row</p>
        </ManagerListState>
      )
    );

    expect(container.querySelector('[aria-busy="true"]')?.children.length).toBe(
      3
    );
  });
});
