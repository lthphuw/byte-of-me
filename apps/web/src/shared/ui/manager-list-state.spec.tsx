import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
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

  it('announces a failed load and retries from the button', () => {
    const onRetry = mock();
    render(
      withIntl(
        <ManagerListState
          isLoading={false}
          isError
          onRetry={onRetry}
          isEmpty={false}
          emptyTitle="Nothing here yet"
        >
          <p>row</p>
        </ManagerListState>
      )
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText('row')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
