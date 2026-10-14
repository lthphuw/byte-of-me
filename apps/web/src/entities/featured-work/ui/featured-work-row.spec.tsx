/**
 * What a visitor can observe on one featured work: its proof links (one row each, with
 * the pull request's repo, number, state and stars), the demo, and the details, which
 * always show. Renders the real component inside the real English catalogue.
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

const PR = 'https://github.com/roboflow/rf-detr/pull/512';

const base: PublicFeaturedWork = {
  id: 'w1',
  title: 'Faster detector export',
  detailsHtml: null,
  links: [
    {
      id: 'l1',
      url: PR,
      label: 'INT8',
      host: 'github.com',
      pr: { repo: 'roboflow/rf-detr', number: 512 },
      github: {
        repo: 'roboflow/rf-detr',
        stars: 4200,
        title: 'Export INT8',
        state: 'MERGED',
      },
    },
  ],
  media: [],
};

function renderRow(work: Partial<PublicFeaturedWork> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ homepage: en.homepage }}>
      <FeaturedWorkRow work={{ ...base, ...work }} />
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

describe('FeaturedWorkRow links', () => {
  it('draws each link as its own new-tab link, and the title as plain text', () => {
    renderRow();

    const link = screen.getByRole('link', { name: /INT8.*\(opens in a new tab\)/ });
    expect(link.getAttribute('href')).toBe(PR);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Faster detector export' })
    ).toBeTruthy();
  });

  it('lists the links in order, under the title', () => {
    renderRow({
      links: [
        ...base.links,
        {
          id: 'l2',
          url: 'https://github.com/a/b/pull/7',
          label: 'Keypoints',
          host: 'github.com',
          pr: { repo: 'a/b', number: 7 },
          github: null,
        },
      ],
    });

    expect(
      screen.getByRole('list', { name: 'Pull requests' }).textContent
    ).toContain('INT8');
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual([
      expect.stringContaining('INT8'),
      expect.stringContaining('Keypoints'),
    ]);
  });

  it('shows the repo, the number, the state and the stars of a pull request', () => {
    renderRow();

    expect(screen.getByText('roboflow/rf-detr #512')).toBeTruthy();
    expect(screen.getByText('Merged')).toBeTruthy();
    expect(screen.getByText(/4,200 stars/)).toBeTruthy();
  });

  it('names a link by its label, else the PR title, else the repo and number', () => {
    renderRow({
      links: [
        { ...base.links[0]!, id: 'a', label: null },
        { ...base.links[0]!, id: 'b', label: null, github: null },
      ],
    });

    expect(
      screen.getByRole('link', { name: /Export INT8.*opens in a new tab/ })
    ).toBeTruthy();
    expect(
      screen.getAllByRole('link', { name: /roboflow\/rf-detr #512.*opens in a new tab/ })
    ).toHaveLength(1);
  });

  it('shows the state as text, so colour is never the only signal', () => {
    renderRow({
      links: [{ ...base.links[0]!, github: { ...base.links[0]!.github!, state: 'OPEN' } }],
    });

    expect(screen.getByText('Open')).toBeTruthy();
  });

  it('gives a non-pull-request link its host alone', () => {
    renderRow({
      links: [
        {
          id: 'blog',
          url: 'https://example.com/post',
          label: null,
          host: 'example.com',
          pr: null,
          github: null,
        },
      ],
    });

    expect(screen.getByRole('link', { name: /example\.com/ })).toBeTruthy();
    expect(screen.queryByText(/stars?$/)).toBeNull();
  });

  it('keeps a pull request link with no GitHub facts, showing the repo and number', () => {
    renderRow({
      links: [{ ...base.links[0]!, label: null, github: null }],
    });

    expect(screen.getByRole('link', { name: /roboflow\/rf-detr #512/ })).toBeTruthy();
    expect(screen.queryByText('Merged')).toBeNull();
    expect(screen.queryByText(/stars?$/)).toBeNull();
  });

  it('draws no link list for a work without links, and no link at all', () => {
    renderRow({ links: [] });

    expect(screen.queryByRole('list', { name: 'Pull requests' })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Faster detector export' })
    ).toBeTruthy();
  });

  it('draws no row number before the title', () => {
    renderRow();

    expect(screen.queryByText(/^(NaN|\d{2})$/)).toBeNull();
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
          work={{
            ...base,
            links: [{ ...base.links[0]!, github: { ...base.links[0]!.github!, stars: 9755 } }],
          }}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByText(/9\.755 sao/)).toBeTruthy();
  });

  it('names the pull request state in Vietnamese', () => {
    const homepage = vi.homepage as unknown as typeof en.homepage;
    render(
      <NextIntlClientProvider locale="vi" messages={{ homepage }}>
        <FeaturedWorkRow work={base} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Đã hợp nhất')).toBeTruthy();
  });
});

const DETAILS_HTML = '<p>How it was done: a streaming writer.</p>';

describe('FeaturedWorkRow with details', () => {
  it('shows the details at once, with no toggle and no link of their own', () => {
    renderRow({ detailsHtml: DETAILS_HTML });

    expect(screen.queryByRole('button')).toBeNull();
    expect(
      screen.getByText('How it was done: a streaming writer.')
    ).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('shows a work with details and no links, with no link anywhere', () => {
    renderRow({ detailsHtml: DETAILS_HTML, links: [] });

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

  it('keeps the demo beside the proof links, with no link of its own', () => {
    renderRow({ media });

    expect(screen.queryByRole('button', { name: /details$/ })).toBeNull();
    expect(document.querySelectorAll('figure')).toHaveLength(2);
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
        <FeaturedWorkRow work={{ ...base, media: media.slice(0, 1) }} />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('button', { name: 'Phát FP16' })).toBeTruthy();
  });
});
