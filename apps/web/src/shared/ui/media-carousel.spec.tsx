/**
 * The media carousel as a visitor meets it: slides of which the next is only partly in view,
 * arrows and dots only when there is something to move to. Renders the real component with
 * the real Carousel; happy-dom lays nothing out, so widths are pinned as a class contract.
 */
import { cleanup, render as plainRender, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../messages/en.json';

import { MediaCarousel } from './media-carousel';
import { mediaSlideBasis } from './media-carousel-classes';

afterEach(cleanup);

const render = (ui: React.ReactElement) =>
  plainRender(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );

const slides = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    node: <p>slide {i + 1}</p>,
  }));

const slideEls = () => [
  ...document.querySelectorAll('[aria-roledescription="slide"]'),
];
/** The dots: small rounded boxes in the overlay that sits at the bottom of the carousel. */
const dots = () =>
  document.querySelectorAll('.pointer-events-none.absolute > div');

describe('MediaCarousel', () => {
  it('draws one slide per item, each holding its own content', () => {
    render(<MediaCarousel slides={slides(3)} />);

    expect(slideEls()).toHaveLength(3);
    expect(screen.getByText('slide 2')).toBeTruthy();
  });

  it('draws nothing for no slides', () => {
    const { container } = render(<MediaCarousel slides={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('offers arrows and one dot per slide when there is a next slide to move to', () => {
    render(<MediaCarousel slides={slides(2)} />);

    expect(screen.getByText('Previous slide')).toBeTruthy();
    expect(screen.getByText('Next slide')).toBeTruthy();
    expect(dots()).toHaveLength(2);
  });

  it('offers neither arrows nor dots for a lone slide', () => {
    render(<MediaCarousel slides={slides(1)} />);

    expect(screen.queryByText('Next slide')).toBeNull();
    expect(dots()).toHaveLength(0);
  });

  it('keeps the dots out of the way of a tap on the slide beneath them', () => {
    render(<MediaCarousel slides={slides(2)} />);

    expect(
      document
        .querySelector('.absolute.bottom-3')
        ?.classList.contains('pointer-events-none')
    ).toBe(true);
  });

  it('widens a lone slide to the row only when asked', () => {
    render(<MediaCarousel slides={slides(1)} />);
    expect(slideEls()[0]?.className).toContain('md:basis-[58%]');
    cleanup();

    render(<MediaCarousel slides={slides(1)} fillSingle />);
    expect(slideEls()[0]?.className).toContain('basis-full');
    expect(slideEls()[0]?.className).not.toContain('md:basis-[58%]');
  });
});

describe('mediaSlideBasis', () => {
  it('lets the next slide of several peek in: 85% on a phone, 58% from md', () => {
    expect(mediaSlideBasis(2)).toBe('basis-[85%] md:basis-[58%]');
    expect(mediaSlideBasis(5, true)).toBe('basis-[85%] md:basis-[58%]');
  });

  it('gives a lone slide the full width on a phone, and from md the narrower width unless it fills', () => {
    expect(mediaSlideBasis(1)).toBe('basis-full md:basis-[58%]');
    expect(mediaSlideBasis(1, true)).toBe('basis-full');
  });
});
