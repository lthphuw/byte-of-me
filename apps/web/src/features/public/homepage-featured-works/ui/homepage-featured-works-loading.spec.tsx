/**
 * The loading skeleton must draw each row with the plain row's grid, or the list
 * jumps when it resolves (AGENTS §14). Both are rendered for real and their class
 * lists compared; jsdom cannot see layout, so the class contract is what is checked.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { HomepageFeaturedWorksLoading } from './homepage-featured-works-loading';

import { FeaturedWorkItem } from '@/entities/featured-work/ui/featured-work-item';

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
        details={null}
      />
    );
    const header = plain.getByText('01').parentElement;
    if (!header) throw new Error('the row has no header');
    const headerClasses = classesOf(header);

    expect(headerClasses).toContain('grid');
    expect(skeletonClasses.filter((name) => !headerClasses.includes(name))).toEqual([]);
    expect(headerClasses.filter((name) => !skeletonClasses.includes(name))).toEqual(['group']);
  });
});
