/**
 * The `<FormControl>` half of the media pickers.
 *
 * `FormControl` injects `id`, `aria-describedby` and `aria-invalid` through a
 * Radix `Slot`, and `FormLabel` points its `htmlFor` at that id. Both pickers
 * take a fixed prop list and spread the remainder onto their trigger button;
 * dropping that spread — the state they were both in — leaves the label
 * pointing at nothing and the error text unreachable, with no type error and
 * nothing visibly different on screen.
 *
 * The sibling case for the controls that live in `packages/ui` (DatePicker,
 * MultiSelect, RichTextEditor) is `packages/ui/src/form.spec.tsx`.
 */
import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@byte-of-me/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

import { MediaMultiSelect } from './media-multi-select';
import { MediaSelect } from './media-select';

import { mediaKeys } from '@/entities/media/model/query-keys';

// `@testing-library/react` only auto-registers cleanup against a Jest/Vitest
// shaped global, which `bun:test` is not — and these cases reach their control
// through `document.getElementById`, which would otherwise find a leftover
// render from an earlier test.
afterEach(() => {
  cleanup();
});

const ERROR_MESSAGE = 'Pick an image';

const messages = {
  dashboard: {
    media: {
      picker: {
        libraryLabel: 'Library',
        uploadButton: 'Upload',
        uploadAssetsTitle: 'Upload Assets',
        clearAll: 'Clear All',
        selectMedia: 'Select Media',
        selectedCount: '{count, plural, =1 {1 selected} other {# selected}}',
        moreCount: '{count, plural, =1 {+ 1 more} other {+ # more}}',
        clickToManage: 'Click to manage',
        clickToChange: 'Click to change',
        chooseFromLibrary: 'Upload or choose from library',
        selectedAlt: 'Selected',
        loadMore: 'Load More',
      },
      toast: {
        uploadSuccess: 'Upload successful',
        uploadError: 'Upload failed',
      },
    },
  },
} as const;

/**
 * An empty media library, seeded into the cache rather than fetched. The
 * pickers call `useMediaInfiniteQuery` themselves and there is no prop to turn
 * it off; priming the key the entity's own factory produces is what keeps this
 * spec from reaching for a server action (and a database) to assert on an
 * `aria-` attribute.
 */
function makeQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnMount: false },
    },
  });

  queryClient.setQueryData(mediaKeys.infinite(12), {
    pages: [
      {
        data: [],
        meta: { currentPage: 1, totalPages: 1, totalCount: 0, hasMore: false },
      },
    ],
    pageParams: [1],
  });

  return queryClient;
}

interface FormValues {
  field: unknown;
}

function Harness({ control }: { control: React.ReactElement }) {
  const form = useForm<FormValues>({
    defaultValues: { field: undefined },
    // Always rejects, so submitting puts the field into the errored state the
    // `aria-*` attributes exist to describe.
    resolver: () => ({
      values: {},
      errors: { field: { type: 'custom', message: ERROR_MESSAGE } },
    }),
  });

  return (
    <QueryClientProvider client={makeQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(() => {})}>
            <FormField
              control={form.control}
              name="field"
              render={() => (
                <FormItem>
                  <FormLabel>Field label</FormLabel>
                  <FormControl>{control}</FormControl>
                  <FormDescription>Helper text</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <button type="submit">Save</button>
          </form>
        </Form>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

async function submitAndResolveLabelTarget(control: React.ReactElement) {
  let container!: HTMLElement;

  await React.act(async () => {
    container = render(<Harness control={control} />).container;
  });

  await React.act(async () => {
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
  });

  const htmlFor = container.querySelector('label')?.getAttribute('for') ?? '';
  return { container, target: document.getElementById(htmlFor) };
}

function expectWiredUp(container: HTMLElement, target: HTMLElement | null) {
  expect(target).not.toBeNull();
  const control = target as HTMLElement;

  // The trigger, not a wrapper around it: a label has to resolve to something
  // that can take focus.
  expect(control.matches('button')).toBe(true);
  expect(control.getAttribute('aria-invalid')).toBe('true');

  const described = (control.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
    .filter(Boolean);

  // What the user can read is what a screen reader is handed.
  expect(container.textContent).toContain(ERROR_MESSAGE);
  expect(described).toContain(ERROR_MESSAGE);
  expect(described).toContain('Helper text');
}

describe('FormControl wiring', () => {
  test('MediaSelect', async () => {
    const { container, target } = await submitAndResolveLabelTarget(
      <MediaSelect onChange={() => {}} />
    );
    expectWiredUp(container, target);
  });

  test('MediaMultiSelect', async () => {
    const { container, target } = await submitAndResolveLabelTarget(
      <MediaMultiSelect onChange={() => {}} />
    );
    expectWiredUp(container, target);
  });
});
