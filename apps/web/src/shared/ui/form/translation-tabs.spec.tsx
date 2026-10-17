/**
 * An unselected tab is unmounted, so a failed submit on the wrong tab would show nothing. The tabs
 * subscribe to their own errors and switch themselves at any nesting depth, on a failed SUBMIT only,
 * never while typing (a per-dialog `onInvalid` reached only the outermost tabs).
 */
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';
import { z } from 'zod';

import { TextField } from './text-field';
import { firstErroredIndex, TranslationTabs } from './translation-tabs';

// `@testing-library/react` only auto-registers cleanup against a Jest/Vitest
// shaped global, which `bun:test` is not; without this, the previous test's
// tabs are still in `document.body` when the next one queries by label.
afterEach(() => {
  cleanup();
});

const messages = {
  dashboard: {
    shared: {
      translationTabs: {
        addLanguage: 'Add Language',
        removeLanguage: 'Remove Language',
        languageLabel: 'Language',
        languagePlaceholder: 'en, vi...',
      },
    },
  },
} as const;

const schema = z.object({
  translations: z.array(
    z.object({
      language: z.string().min(1),
      title: z.string().min(1, 'Title required'),
      tasks: z.array(
        z.object({
          language: z.string().min(1),
          content: z.string().min(1, 'Content required'),
        })
      ),
    })
  ),
});

type Values = z.infer<typeof schema>;

/** Second translation is invalid; its second task is invalid too. */
const DEFAULTS: Values = {
  translations: [
    {
      language: 'en',
      title: 'English title',
      tasks: [{ language: 'en', content: 'ok' }],
    },
    {
      language: 'vi',
      title: '',
      tasks: [
        { language: 'en', content: 'ok' },
        { language: 'vi', content: '' },
      ],
    },
  ],
};

interface HarnessProps {
  /** Renders the nested tabs inside each translation. */
  nested?: boolean;
}

function Harness({ nested = false }: HarnessProps) {
  const form = useForm<Values>({
    defaultValues: DEFAULTS,
    resolver: zodResolver(schema),
  });

  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => {})}>
          <TranslationTabs
            control={form.control}
            name="translations"
            newTranslation={() => ({ language: '', title: '', tasks: [] })}
            renderFields={(i) => (
              <>
                <TextField
                  control={form.control}
                  name={`translations.${i}.title`}
                  label={`Title ${i}`}
                />
                {nested && (
                  <TranslationTabs
                    control={form.control}
                    name={`translations.${i}.tasks`}
                    newTranslation={() => ({ language: '', content: '' })}
                    renderFields={(j) => (
                      <TextField
                        control={form.control}
                        name={`translations.${i}.tasks.${j}.content`}
                        label={`Task ${i}-${j}`}
                      />
                    )}
                  />
                )}
              </>
            )}
          />
          <button type="submit">Save</button>
        </form>
      </Form>
    </NextIntlClientProvider>
  );
}

async function mount(props: HarnessProps = {}): Promise<HTMLElement> {
  let container!: HTMLElement;
  await React.act(async () => {
    container = render(<Harness {...props} />).container;
  });
  return container;
}

async function submit(container: HTMLElement): Promise<void> {
  await React.act(async () => {
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
  });
}

/** Radix `TabsTrigger` selects on `mousedown`, not on `click`. */
async function clickTab(label: string): Promise<void> {
  await React.act(async () => {
    fireEvent.mouseDown(screen.getByRole('tab', { name: label }), {
      button: 0,
    });
  });
}

describe('TranslationTabs selection', () => {
  test('opens on the first translation and follows a click', async () => {
    await mount();

    // Tabs are labelled from the live `language` value, not from an index.
    expect(screen.getByLabelText('Title 0')).toBeDefined();
    expect(screen.queryByLabelText('Title 1')).toBeNull();

    await clickTab('VI');

    expect(screen.getByLabelText('Title 1')).toBeDefined();
    expect(screen.queryByLabelText('Title 0')).toBeNull();
  });

  test('relabels a tab as its language is typed', async () => {
    await mount();
    expect(screen.getByRole('tab', { name: 'EN' })).toBeDefined();

    await React.act(async () => {
      fireEvent.change(screen.getByLabelText('Language'), {
        target: { value: 'fr' },
      });
    });

    // The label follows the field, and the other tab is left as it was.
    expect(screen.getByRole('tab', { name: 'FR' })).toBeDefined();
    expect(screen.queryByRole('tab', { name: 'EN' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'VI' })).toBeDefined();
  });
});

describe('TranslationTabs error reveal', () => {
  test('a failed submit reveals the tab holding the invalid field', async () => {
    const container = await mount();
    expect(screen.getByLabelText('Title 0')).toBeDefined();

    await submit(container);

    expect(screen.getByLabelText('Title 1')).toBeDefined();
    expect(screen.getByText('Title required')).toBeDefined();
  });

  test('typing afterwards does not move the tab', async () => {
    const container = await mount();
    await submit(container);

    // Back on the valid tab by hand: the tab-1 error is live and react-hook-form revalidates on every
    // keystroke, so a reveal keyed off `errors`, not `submitCount`, would yank the tab away mid-word.
    await clickTab('EN');
    expect(screen.getByLabelText('Title 0')).toBeDefined();

    await React.act(async () => {
      fireEvent.change(screen.getByLabelText('Title 0'), {
        target: { value: 'English title edited' },
      });
    });

    expect(screen.getByLabelText('Title 0')).toBeDefined();
    expect(screen.queryByLabelText('Title 1')).toBeNull();
  });

  test('reveals a NESTED tab the parent never knew about', async () => {
    const container = await mount({ nested: true });

    await submit(container);

    // Outer tabs revealed translation 1; the tabs inside it mounted only at
    // that moment, already after the failed submit, and still found their own
    // invalid task. This is the case three call sites were silent for.
    expect(screen.getByLabelText('Title 1')).toBeDefined();
    expect(screen.getByLabelText('Task 1-1')).toBeDefined();
    expect(screen.queryByLabelText('Task 1-0')).toBeNull();
    expect(screen.getByText('Content required')).toBeDefined();
  });
});

describe('firstErroredIndex', () => {
  test('finds the first populated entry of a sparse field-array error', () => {
    const errors: unknown[] = [];
    // react-hook-form leaves holes for the entries that validated.
    errors[2] = { title: { type: 'too_small', message: 'Title required' } };

    expect(firstErroredIndex(errors)).toBe(2);
  });

  test('returns null when the array has no errors', () => {
    expect(firstErroredIndex([])).toBeNull();
  });

  test('returns null for undefined', () => {
    // The ordinary case: the field array validated, so there is no entry at
    // all under that key.
    expect(firstErroredIndex(undefined)).toBeNull();
  });

  test('returns null for a root-level error on the array itself', () => {
    // A `min(1)` on the array reports against the array NODE, not an element —
    // an object, not a sparse list, and there is no tab to reveal for it.
    expect(
      firstErroredIndex({ type: 'too_small', message: 'Add one language' })
    ).toBeNull();
  });
});
