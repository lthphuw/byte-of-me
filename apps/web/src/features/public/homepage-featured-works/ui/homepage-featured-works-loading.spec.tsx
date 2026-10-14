/**
 * The loading skeleton must draw each work with the same classes as a real one, or the
 * list jumps when it resolves (AGENTS §14). Both are rendered for real and their class
 * lists compared; jsdom cannot see layout, so the class contract is what is checked.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import { HomepageFeaturedWorksLoading } from './homepage-featured-works-loading';

import { FeaturedWorkItem } from '@/entities/featured-work/ui/featured-work-item';
import {
  WORK_HEAD,
  WORK_LINKS,
  WORK_ROW,
  WORK_TITLE,
} from '@/entities/featured-work/ui/featured-work-row-classes';

afterEach(cleanup);

const classesOf = (element: Element) =>
  element.className.split(/\s+/).filter(Boolean);

/** The class lists of a demo's root, its viewport, its track and its first slide. */
function carouselLevels(root: Element): string[][] {
  const viewport = root.firstElementChild!;
  const track = viewport.firstElementChild!;
  const slide = track.firstElementChild!;
  return [root, viewport, track, slide].map(classesOf);
}

describe('HomepageFeaturedWorksLoading', () => {
  it('draws each work with the classes of a real featured work', () => {
    const skeleton = render(<HomepageFeaturedWorksLoading />);
    const skeletonRow = skeleton.container.querySelector('li');
    if (!skeletonRow) throw new Error('the skeleton renders no rows');
    const skeletonRowClasses = classesOf(skeletonRow);
    const skeletonHeadClasses = classesOf(skeletonRow.firstElementChild!);
    // The demo, level by level: the carousel's root, its viewport, its track and a slide.
    const skeletonLevels = carouselLevels(skeletonRow.children[1]!);
    skeleton.unmount();

    const real = render(
      <NextIntlClientProvider
        locale="en"
        messages={{
          components: { expandableText: en.components.expandableText },
        }}
      >
        <FeaturedWorkItem
          anchorId="featured-works-w1"
          title="Faster detector export"
          links={
            <ul className={WORK_LINKS}>
              <li>
                <a href="https://example.com/work">INT8</a>
              </li>
            </ul>
          }
          details={<p>How it was done.</p>}
          media={[
            {
              id: 'm1',
              url: 'https://cdn.example.com/fp16.mp4',
              isVideo: true,
              caption: null,
              name: 'FP16',
              playLabel: 'Play FP16',
              fullscreenLabel: 'Full screen FP16',
            },
            {
              id: 'm2',
              url: 'https://cdn.example.com/int8.gif',
              isVideo: false,
              caption: null,
              name: 'INT8',
              playLabel: 'Play INT8',
              fullscreenLabel: 'Full screen INT8',
            },
          ]}
          demoControls={{
            zoomIn: 'Zoom in',
            zoomOut: 'Zoom out',
            zoomReset: 'Reset zoom',
            exitFullscreen: 'Exit full screen',
          }}
        />
      </NextIntlClientProvider>
    );
    const realRoot = real.container.firstElementChild!;
    const realHead = realRoot.firstElementChild!;
    const realLevels = carouselLevels(realRoot.children[1]!);

    expect(
      skeletonRowClasses.filter((name) => !classesOf(realRoot).includes(name))
    ).toEqual([]);
    expect(
      skeletonHeadClasses.filter((name) => !classesOf(realHead).includes(name))
    ).toEqual([]);
    skeletonLevels.forEach((classes, level) => {
      expect(
        classes.filter((name) => !realLevels[level]?.includes(name))
      ).toEqual([]);
    });
  });

  it('draws two works, each a head, a demo carousel and a body, and no rule of its own', () => {
    const { container } = render(<HomepageFeaturedWorksLoading />);
    // The works are the list under the heading; the proof-link rows are nested inside them.
    const rows = [...(container.querySelector('ul')?.children ?? [])];

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(classesOf(row)).toEqual(
        expect.arrayContaining(WORK_ROW.split(' '))
      );
      expect(row.children).toHaveLength(3);
      expect(row.children[0]?.className).toBe(WORK_HEAD);
      // A pair of slides, 85% wide on a phone so the next one peeks in.
      const slides = row.children[1]?.querySelectorAll('.flex > div') ?? [];
      expect(slides).toHaveLength(2);
      expect(slides[0]?.className).toContain('basis-[85%]');
      expect(row.querySelector('.leading-relaxed')).toBeNull();
    }
  });

  it('draws the title as one bar at the title size, with one bar per proof link beside it', () => {
    const { container } = render(<HomepageFeaturedWorksLoading />);
    const head = container.querySelector('li')?.firstElementChild;

    expect(head?.children[0]?.className).toContain(WORK_TITLE.split(' ')[0]!);
    const links = head?.children[1];
    expect(links?.tagName).toBe('UL');
    expect(links?.children).toHaveLength(2);
    expect(links?.querySelectorAll('li > .animate-pulse').length).toBe(2);
  });

  it('keeps the heading to a single bar, with the list under it', () => {
    const { container } = render(<HomepageFeaturedWorksLoading />);
    const header = container.firstElementChild?.firstElementChild;

    expect(header?.classList.contains('animate-pulse')).toBe(true);
    expect(header?.nextElementSibling?.tagName).toBe('UL');
  });
});
