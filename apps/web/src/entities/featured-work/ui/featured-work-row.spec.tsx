/**
 * What a visitor can observe on one featured-work line: the link behaviour, the
 * number, the repo/host line, and the details, which always show. Renders the real
 * component inside the real English catalogue.
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
    renderRow({
      url: 'https://example.com/post',
      host: 'example.com',
      github: null,
    });

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

  it('draws no paragraph of its own for a work without details', () => {
    const { container } = renderRow();

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
  it('shows the details at once, with no toggle, and its one link beside them', () => {
    renderRow({ detailsHtml: DETAILS_HTML });

    expect(screen.queryByRole('button')).toBeNull();
    expect(
      screen.getByText('How it was done: a streaming writer.')
    ).toBeTruthy();
    const link = screen.getByRole('link', {
      name: 'View on GitHub (opens in a new tab)',
    });
    expect(link.getAttribute('href')).toBe(base.url);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(link.closest('[inert]')).toBeNull();
  });

  it('names the host instead of GitHub when the work has no GitHub details', () => {
    renderRow({
      detailsHtml: DETAILS_HTML,
      url: 'https://example.com/post',
      host: 'example.com',
      github: null,
    });

    expect(
      screen.getByRole('link', {
        name: 'Visit example.com (opens in a new tab)',
      })
    ).toBeTruthy();
  });

  it('shows a work with details and no url, with no link anywhere', () => {
    renderRow({
      detailsHtml: DETAILS_HTML,
      url: null,
      host: null,
      github: null,
    });

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(
      screen.getByText('How it was done: a streaming writer.')
    ).toBeTruthy();
  });

  it('gives a work without details no button at all', () => {
    renderRow();

    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('FeaturedWorkRow with a demo', () => {
  const media = [
    {
      id: 'm1',
      url: 'https://cdn.example.com/fp16.mp4',
      mimeType: 'video/mp4',
      label: 'FP16',
      width: 1920,
      height: 670,
    },
    {
      id: 'm2',
      url: 'https://cdn.example.com/int8.gif',
      mimeType: 'image/gif',
      label: null,
      width: 1152,
      height: 1152,
    },
  ];

  it('shows a work that has only a demo at once, with the link beside the demo', () => {
    renderRow({ media });

    expect(screen.queryByRole('button', { name: /details$/ })).toBeNull();
    expect(document.querySelectorAll('figure')).toHaveLength(2);
    const link = screen.getByRole('link', {
      name: 'View on GitHub (opens in a new tab)',
    });
    expect(link.getAttribute('href')).toBe(base.url);
    expect(link.closest('[inert]')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('names each clip and image from its label, or the work title when it has none', () => {
    renderRow({ media });

    expect(screen.getByRole('button', { name: 'Play FP16' })).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Faster detector export' })
    ).toBeTruthy();
    expect(document.querySelectorAll('figcaption')).toHaveLength(1);
  });

  it('names the clip button in Vietnamese', () => {
    const homepage = vi.homepage as unknown as typeof en.homepage;
    render(
      <NextIntlClientProvider locale="vi" messages={{ homepage }}>
        <FeaturedWorkRow
          work={{ ...base, media: media.slice(0, 1) }}
          index={0}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('button', { name: 'Phát FP16' })).toBeTruthy();
  });
});
