import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../messages/en.json';

import { RecordListSkeleton, RecordRowActions } from './record-list';

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

/** The skeleton's root carries `aria-busy`; each child is one row. */
function skeletonRowCount(container: HTMLElement) {
  return container.querySelector('[aria-busy="true"]')?.children.length;
}

describe('RecordRowActions', () => {
  it('names each action after the item it acts on', () => {
    render(
      withIntl(
        <RecordRowActions
          name="Spring project"
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )
    );

    expect(
      screen.queryByRole('button', { name: 'Edit Spring project' })
    ).not.toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Delete Spring project' })
    ).not.toBeNull();
  });

  it('renders only the actions it is given', () => {
    render(
      withIntl(<RecordRowActions name="Spring project" onEdit={() => {}} />)
    );

    expect(
      screen.queryByRole('button', { name: 'Delete Spring project' })
    ).toBeNull();
  });

  it('does not run an action while it is disabled', () => {
    const onEdit = mock(() => {});
    render(
      withIntl(
        <RecordRowActions name="Spring project" onEdit={onEdit} disabled />
      )
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit Spring project' })
    );

    expect(onEdit).not.toHaveBeenCalled();
  });
});

describe('RecordListSkeleton', () => {
  it('renders six rows by default', () => {
    const { container } = render(withIntl(<RecordListSkeleton />));

    expect(skeletonRowCount(container)).toBe(6);
  });

  it('renders the number of rows it is given', () => {
    const { container } = render(withIntl(<RecordListSkeleton rows={2} />));

    expect(skeletonRowCount(container)).toBe(2);
  });
});
