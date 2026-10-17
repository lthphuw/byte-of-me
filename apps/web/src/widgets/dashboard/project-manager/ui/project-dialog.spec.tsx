/**
 * The form opens already holding the project it edits, and a new project opens
 * empty even right after an edit; the seeded values must survive validation on
 * save. The form is seeded once at mount, no longer reset by an effect.
 */
import { tagKeys } from '@byte-of-me/contracts/tag';
import { techStackKeys } from '@byte-of-me/contracts/tech-stack';
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
  onSubmit = mock<(values: unknown) => void>(),
  onOpenChange = mock<(open: boolean) => void>()
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
          onOpenChange={onOpenChange}
          isEditing={data !== null}
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
    onOpenChange,
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

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      slug: 'my-portfolio',
      isPublished: true,
      startDate: '2024-05-01',
      translations: [{ language: 'en', title: 'Portfolio' }],
    });
  });

  it('closes an untouched edit on Cancel without asking', () => {
    const { onOpenChange } = renderDialog(project);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
  });

  it('asks before discarding an edit, and closes only on Discard', async () => {
    const { onOpenChange } = renderDialog(project);

    fireEvent.change(screen.getByDisplayValue('Portfolio'), {
      target: { value: 'Renamed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
