/**
 * The form opens already holding the project it edits, and a new project opens
 * empty even right after an edit; the seeded values must survive validation on
 * save. The form is seeded once at mount, no longer reset by an effect.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import { ProjectDialog } from './project-dialog';

import type { AdminProject } from '@/entities/project/model';
import { tagKeys } from '@/entities/tag/model/query-keys';
import { techStackKeys } from '@/entities/tech-stack/model/query-keys';

afterEach(cleanup);

const NOW = new Date('2026-01-01T00:00:00.000Z');

const project: AdminProject = {
  id: 'p1',
  createdAt: NOW,
  updatedAt: NOW,
  userId: 'admin-1',
  slug: 'my-portfolio',
  githubLink: 'https://github.com/me/portfolio',
  liveLink: null,
  startDate: new Date('2024-05-01T00:00:00.000Z'),
  endDate: null,
  isPublished: true,
  translations: [
    { id: 't1', language: 'en', title: 'Portfolio', description: '' },
  ],
  techStacks: [],
  tags: [],
  coauthors: [],
};

function renderDialog(
  initialData: AdminProject | null,
  onSubmit = mock<(values: unknown) => void>()
) {
  // The pickers read these; seeding keeps the spec off the server actions.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(tagKeys.options('en'), []);
  queryClient.setQueryData(techStackKeys.options(), []);

  const tree = (data: AdminProject | null) => (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider
        locale="en"
        messages={{ dashboard: en.dashboard }}
      >
        <ProjectDialog
          key={data?.id ?? 'new'}
          open
          onOpenChange={() => {}}
          initialData={data}
          onSubmit={onSubmit}
          loading={false}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  const view = render(tree(initialData));
  return {
    onSubmit,
    rerenderWith: (data: AdminProject | null) => view.rerender(tree(data)),
  };
}

describe('ProjectDialog', () => {
  it("opens an edit already holding the project's values", () => {
    renderDialog(project);

    expect(screen.getByDisplayValue('my-portfolio')).toBeTruthy();
    expect(screen.getByDisplayValue('Portfolio')).toBeTruthy();
    expect(screen.getByDisplayValue('2024-05-01')).toBeTruthy();
    expect(
      screen.getByDisplayValue('https://github.com/me/portfolio')
    ).toBeTruthy();
    expect(
      screen
        .getByRole('checkbox', { name: 'Published' })
        .getAttribute('aria-checked')
    ).toBe('true');
  });

  it('opens a new project empty right after editing one', () => {
    const { rerenderWith } = renderDialog(project);

    rerenderWith(null);

    expect(screen.queryByDisplayValue('my-portfolio')).toBeNull();
    expect(screen.queryByDisplayValue('Portfolio')).toBeNull();
    expect(
      screen
        .getByRole('checkbox', { name: 'Published' })
        .getAttribute('aria-checked')
    ).toBe('false');
  });

  it('submits the seeded project, so saving an untouched edit keeps its data', async () => {
    const { onSubmit } = renderDialog(project);

    fireEvent.click(screen.getByRole('button', { name: 'Save Project' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      slug: 'my-portfolio',
      isPublished: true,
      startDate: '2024-05-01',
      translations: [{ language: 'en', title: 'Portfolio' }],
    });
  });
});
