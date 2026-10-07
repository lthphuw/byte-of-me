/**
 * What this defends is the timeline's entrance: it plays for the first result
 * set only, and nothing is ever hidden in the server HTML — the newest items
 * hold the LCP element, and Chrome ignores an `opacity: 0` candidate until JS
 * reveals it. A result set that arrives later (filter, page) must not start
 * hidden, or the entrance replays on every change.
 */
import { renderToString } from 'react-dom/server';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogues live outside `src/`, so only a relative path reaches them.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import { ProjectsTimeline } from './projects-timeline';

import type { PublicProject } from '@/entities/project/model/types';

function project(id: string): PublicProject {
  return {
    id,
    slug: id,
    title: id,
    description: null,
    githubLink: null,
    liveLink: null,
    isPublished: true,
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: null,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    tags: [],
    techStacks: [],
  };
}

function timeline(ids: string[], playEntrance: boolean) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <ProjectsTimeline projects={ids.map(project)} playEntrance={playEntrance} />
    </NextIntlClientProvider>
  );
}

const opacityOf = (el: Element) => (el as HTMLElement).style.opacity;

describe('ProjectsTimeline', () => {
  it('is never hidden in the server HTML', () => {
    const html = renderToString(timeline(['a', 'b', 'c', 'd'], true));

    expect(html).toContain('a');
    expect(html).not.toContain('opacity:0');
  });

  it('animates only the first screen on a client mount', () => {
    const { container } = render(timeline(['a', 'b', 'c', 'd'], true));
    const items = [...container.querySelectorAll('li')];

    expect(items.map(opacityOf)).toEqual(['0', '0', '', '']);
  });

  it('mounts a later result set visible, even in the first slot', () => {
    const { container, rerender } = render(timeline(['a', 'b', 'c'], true));

    rerender(timeline(['x', 'y', 'a', 'b', 'c'], false));

    const [x, y] = [...container.querySelectorAll('li')];
    expect([opacityOf(x), opacityOf(y)]).toEqual(['', '']);
  });
});
