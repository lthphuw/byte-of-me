/**
 * What a visitor can observe on one featured work: its proof links (plain `#number` text; the
 * repo, label and state are hover and screen-reader only), the demo, and the details, which
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
  it('draws each pull request as its number alone: a new-tab link, with the title as plain text', () => {
    renderRow();

    const link = screen.getByRole('link', { name: /#512.*\(opens in a new tab\)/ });
    // The number is the whole visible text; the rest is for screen readers.
    expect(link.firstChild?.textContent).toBe('#512');
    expect(link.getAttribute('href')).toBe(PR);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Faster detector export' })
    ).toBeTruthy();
  });

  it('draws a link with no box of its own: no border, no pill', () => {
    renderRow();

    const link = screen.getByRole('link');
    expect(link.className).not.toMatch(/\bborder\b|rounded-full/);
    expect(link.className).toContain('underline');
  });

  it('lists the links in order, beside the title', () => {
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
      screen.getAllByRole('link').map((a) => a.firstChild?.textContent)
    ).toEqual(['#512', '#7']);
  });

  it('shows a pull request as its number whatever its label, keeping the label on hover and for a screen reader', () => {
    renderRow();

    const link = screen.getByRole('link', { name: /#512/ });
    expect(link.firstChild?.textContent).toBe('#512');
    expect(link.getAttribute('title')).toBe('INT8 · roboflow/rf-detr #512');
    expect(link.textContent).toContain('INT8');
  });

  it('puts only the repo on hover for a pull request without a label', () => {
    renderRow({ links: [{ ...base.links[0]!, label: null }] });

    const link = screen.getByRole('link', { name: /#512/ });
    expect(link.firstChild?.textContent).toBe('#512');
    expect(link.getAttribute('title')).toBe('roboflow/rf-detr #512');
  });

  it('names the state for a screen reader, and shows no state word', () => {
    renderRow();

    expect(
      screen.getByRole('link', { name: /#512.*Merged.*opens in a new tab/ })
    ).toBeTruthy();
    expect(screen.queryByText('Merged')).toBeNull();
  });

  it('shows no stars and no repo line', () => {
    renderRow();

    expect(screen.queryByText(/stars?$/)).toBeNull();
    expect(screen.queryByText('roboflow/rf-detr #512')).toBeNull();
  });

  it('gives a non-pull-request link its host, or its label', () => {
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
        {
          id: 'post',
          url: 'https://example.com/write',
          label: 'Write-up',
          host: 'example.com',
          pr: null,
          github: null,
        },
      ],
    });

    expect(
      screen.getByRole('link', { name: /example\.com.*opens in a new tab/ })
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: /Write-up/ })).toBeTruthy();
  });

  it('keeps a pull request link without GitHub facts, with no state name', () => {
    renderRow({ links: [{ ...base.links[0]!, github: null }] });

    const link = screen.getByRole('link', { name: /#512/ });
    expect(link.firstChild?.textContent).toBe('#512');
    expect(link.textContent).not.toMatch(/Merged|Open|Closed/);
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

  it('names the state in Vietnamese for a screen reader', () => {
    const homepage = vi.homepage as unknown as typeof en.homepage;
    render(
      <NextIntlClientProvider locale="vi" messages={{ homepage }}>
        <FeaturedWorkRow work={base} />
      </NextIntlClientProvider>
    );

    expect(
      screen.getByRole('link', { name: /Đã hợp nhất/ })
    ).toBeTruthy();
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
