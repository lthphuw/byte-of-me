/**
 * The loading skeleton must draw each row with the plain row's grid, or the list
 * jumps when it resolves (AGENTS §14). Both are rendered for real and their class
 * lists compared; jsdom cannot see layout, so the class contract is what is checked.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { HomepageFeaturedWorksLoading } from './homepage-featured-works-loading';

import { FeaturedWorkItem } from '@/entities/featured-work/ui/featured-work-item';
import { PLAIN_ROW_HEADER } from '@/entities/featured-work/ui/featured-work-row-classes';

afterEach(cleanup);

const classesOf = (element: Element) => element.className.split(/\s+/).filter(Boolean);

describe('HomepageFeaturedWorksLoading', () => {
  it('draws its rows with the same classes as a plain featured work row, bar the hover hook', () => {
    const skeleton = render(<HomepageFeaturedWorksLoading />);
    const skeletonRow = skeleton.container.querySelector('.divide-y > div');
    if (!skeletonRow) throw new Error('the skeleton renders no rows');
    const skeletonClasses = classesOf(skeletonRow);
    skeleton.unmount();

    const plain = render(
      <FeaturedWorkItem
        anchorId="featured-works-w1"
        number="01"
        title="Faster detector export"
        description={null}
        meta={null}
        href={null}
        newTabLabel="(opens in a new tab)"
        details={null}
        media={[]}
        showDetailsLabel="Show details"
        hideDetailsLabel="Hide details"
      />
    );
    const header = plain.getByText('01').parentElement;
    if (!header) throw new Error('the row has no header');
    const headerClasses = classesOf(header);

    expect(headerClasses).toContain('grid');
    expect(skeletonClasses.filter((name) => !headerClasses.includes(name))).toEqual([]);
    expect(headerClasses.filter((name) => !skeletonClasses.includes(name))).toEqual(['group']);
  });

  it('draws four rows, each a plain row header with a title bar, a description and a meta cell', () => {
    const { container } = render(<HomepageFeaturedWorksLoading />);
    const rows = [...container.querySelectorAll('.divide-y > div')];

    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(classesOf(row)).toEqual(expect.arrayContaining(PLAIN_ROW_HEADER.split(' ')));
      // number, title column, meta cell
      expect(row.children).toHaveLength(3);
      const description = row.querySelector('.leading-relaxed');
      expect(description?.children.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps the heading to a single title bar, with no subtitle line under it', () => {
    const { container } = render(<HomepageFeaturedWorksLoading />);
    const header = container.firstElementChild?.firstElementChild;

    expect(header?.classList.contains('animate-pulse')).toBe(true);
    expect(header?.nextElementSibling?.classList.contains('divide-y')).toBe(true);
  });
});
