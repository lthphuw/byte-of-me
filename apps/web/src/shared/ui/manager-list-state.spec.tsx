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
});
