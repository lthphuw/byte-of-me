/**
 * What a visitor can observe on one featured-work line: the link behaviour, the
 * number, the Merged marker and the repo/host line. Renders the real component
 * inside the real English catalogue.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../messages/en.json';
// eslint-disable-next-line import-alias/import-alias
import vi from '../../../../messages/vi.json';

import { FeaturedWorkRow } from './featured-work-row';

import type { PublicFeaturedWork } from '@/entities/featured-work/model/types';

const base: PublicFeaturedWork = {
  id: 'w1',
  title: 'Faster detector export',
  description: 'Cut the export time in half.',
  url: 'https://github.com/roboflow/rf-detr/pull/512',
  host: 'github.com',
  github: { repo: 'roboflow/rf-detr', stars: 4200, merged: true },
};

function renderRow(work: Partial<PublicFeaturedWork> = {}, index = 0) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ homepage: en.homepage }}>
      <FeaturedWorkRow work={{ ...base, ...work }} index={index} />
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

describe('FeaturedWorkRow', () => {
  it('is one link that names the work and opens in a new tab', () => {
    renderRow();

    const link = screen.getByRole('link', { name: /Faster detector export/ });
    expect(link.getAttribute('href')).toBe(base.url);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('has no link when the work has no url', () => {
    renderRow({ url: null, host: null, github: null });

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Faster detector export')).toBeTruthy();
  });

  it('shows Merged only for a merged pull request', () => {
    renderRow();
    expect(screen.getByText('Merged')).toBeTruthy();
    cleanup();

    renderRow({ github: { repo: 'roboflow/rf-detr', stars: 1, merged: false } });
    expect(screen.queryByText('Merged')).toBeNull();
  });

  it('shows the repository and its star count when GitHub details exist', () => {
    renderRow();

    expect(screen.getByText('roboflow/rf-detr')).toBeTruthy();
    expect(screen.getByText(/4,200 stars/)).toBeTruthy();
    expect(screen.queryByText('github.com')).toBeNull();
  });

  it('falls back to the host alone when there are no GitHub details', () => {
    renderRow({ url: 'https://example.com/post', host: 'example.com', github: null });

    expect(screen.getByText('example.com')).toBeTruthy();
    expect(screen.queryByText('Merged')).toBeNull();
    expect(screen.queryByText(/stars?$/)).toBeNull();
  });

  it('numbers rows from 01 using the zero-based index', () => {
    renderRow({}, 0);
    expect(screen.getByText('01')).toBeTruthy();
    cleanup();

    renderRow({}, 9);
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('renders no description paragraph when the description is null', () => {
    const { container } = renderRow({ description: null });

    expect(container.querySelector('p')).toBeNull();
  });

  it('groups Vietnamese star counts with the locale separator', () => {
    // The typed catalogue is English literals; the cast only widens it for this locale.
    const homepage = vi.homepage as unknown as typeof en.homepage;
    render(
      <NextIntlClientProvider locale="vi" messages={{ homepage }}>
        <FeaturedWorkRow
          work={{ ...base, github: { repo: 'a/b', stars: 9755, merged: false } }}
          index={0}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByText(/9\.755 sao/)).toBeTruthy();
  });
});
