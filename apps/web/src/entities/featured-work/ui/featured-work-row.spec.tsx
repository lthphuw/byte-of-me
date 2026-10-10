/**
 * What a visitor can observe on one featured-work line: the link behaviour, the
 * number and the repo/host line. Renders the real component
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
  detailsHtml: null,
  url: 'https://github.com/roboflow/rf-detr/pull/512',
  host: 'github.com',
  github: { repo: 'roboflow/rf-detr', stars: 4200 },
  media: [],
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
    expect(link.textContent).toContain('(opens in a new tab)');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('has no link when the work has no url', () => {
    renderRow({ url: null, host: null, github: null });

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Faster detector export')).toBeTruthy();
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
          work={{ ...base, github: { repo: 'a/b', stars: 9755 } }}
          index={0}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByText(/9\.755 sao/)).toBeTruthy();
  });
});

const DETAILS_HTML = '<p>How it was done: a streaming writer.</p>';

describe('FeaturedWorkRow with details', () => {
  it('expands from its title, and its one link sits at the end of the body', () => {
    renderRow({ detailsHtml: DETAILS_HTML });

    expect(screen.getAllByRole('button')).toHaveLength(1);
    const link = screen.getByRole('link', {
      name: 'View on GitHub (opens in a new tab)',
    });
    expect(link.getAttribute('href')).toBe(base.url);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(link.closest('[inert]')).not.toBeNull();
  });

  it('keeps the body in the page while it is closed, so it can be read as text', () => {
    renderRow({ detailsHtml: DETAILS_HTML });

    expect(screen.getByText('How it was done: a streaming writer.')).toBeTruthy();
  });

  it('keeps the link out of the toggle, so the header never shows a second control', () => {
    renderRow({ detailsHtml: DETAILS_HTML });

    const toggle = screen.getByRole('button', { name: 'Faster detector export' });
    expect(toggle.querySelector('a')).toBeNull();
  });

  it('names the host instead of GitHub when the work has no GitHub details', () => {
    renderRow({
      detailsHtml: DETAILS_HTML,
      url: 'https://example.com/post',
      host: 'example.com',
      github: null,
    });

    expect(
      screen.getByRole('link', { name: 'Visit example.com (opens in a new tab)' })
    ).toBeTruthy();
  });

  it('expands a work with details and no url, with no link anywhere', () => {
    renderRow({ detailsHtml: DETAILS_HTML, url: null, host: null, github: null });

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('How it was done: a streaming writer.')).toBeTruthy();
  });

  it('gives a work without details no toggle at all', () => {
    renderRow();

    expect(screen.queryByRole('button')).toBeNull();
  });
});
