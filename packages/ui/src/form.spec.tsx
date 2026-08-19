/**
 * What `<FormControl>` promises, and what silently breaks it.
 *
 * `FormControl` injects `id`, `aria-describedby` and `aria-invalid` into its
 * child through a Radix `Slot`, and `FormLabel` points its `htmlFor` at that
 * same id. Nothing enforces that the child does anything with them: a control
 * that takes a fixed prop list and never spreads the rest drops all three, and
 * the result is a label pointing at nothing and an error message no assistive
 * technology can reach — with no warning, no type error and no visual change.
 *
 * Every case below is a control that failed exactly that way. They are driven
 * through a real failed submit rather than `setError`, so the assertions run
 * against the state a user actually reaches.
 */
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'bun:test';

import { DatePicker } from './date-picker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { MultiSelect } from './multi-select';
import { RichTextEditor } from './rich-text-editor/tiptap/rich-text-editor';

// `@testing-library/react` only auto-registers cleanup for a Jest/Vitest-shaped
// global, which `bun:test` is not — and these cases reach their control through
// `document.getElementById`, so a leftover render from an earlier test would be
// found instead of this one's.
afterEach(() => {
  cleanup();
});

const ERROR_MESSAGE = 'This field is required';

interface FormValues {
  field: unknown;
}

/**
 * One field, wired the way every dashboard form wires one, with a resolver that
 * always rejects — so pressing Save puts the field into the errored state the
 * `aria-*` attributes are supposed to describe.
 */
function Harness({ control }: { control: React.ReactElement }) {
  const form = useForm<FormValues>({
    defaultValues: { field: undefined },
    resolver: () => ({
      values: {},
      errors: { field: { type: 'custom', message: ERROR_MESSAGE } },
    }),
  });

  return (
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
  );
}

/** Renders the harness, waiting for a control that mounts asynchronously. */
async function mount(
  control: React.ReactElement,
  waitForSelector?: string
): Promise<HTMLElement> {
  let container!: HTMLElement;

  await React.act(async () => {
    container = render(<Harness control={control} />).container;
  });

  if (waitForSelector) {
    await React.act(async () => {
      const deadline = Date.now() + 5000;
      while (
        !container.querySelector(waitForSelector) &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });
  }

  return container;
}

async function submit(container: HTMLElement): Promise<void> {
  await React.act(async () => {
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
  });
}

/** The element `<FormLabel htmlFor>` actually resolves to, or `null`. */
function labelTarget(container: HTMLElement): HTMLElement | null {
  const htmlFor = container.querySelector('label')?.getAttribute('for') ?? '';
  return document.getElementById(htmlFor);
}

async function submitAndResolveLabelTarget(
  control: React.ReactElement,
  waitForSelector?: string
): Promise<{ container: HTMLElement; target: HTMLElement | null }> {
  const container = await mount(control, waitForSelector);
  await submit(container);
  return { container, target: labelTarget(container) };
}

/**
 * The shared contract: the label resolves to a real element, that element is
 * the interactive control rather than a wrapper around it, and the error text
 * on screen is the text its `aria-describedby` resolves to.
 */
function expectWiredUp(
  container: HTMLElement,
  target: HTMLElement | null,
  interactiveSelector: string
) {
  expect(target).not.toBeNull();
  const control = target as HTMLElement;

  // Not a wrapper: a label has to point at something that can take focus, and
  // the `<div>` these controls render inside cannot.
  expect(control.matches(interactiveSelector)).toBe(true);

  expect(control.getAttribute('aria-invalid')).toBe('true');

  const describedBy = control.getAttribute('aria-describedby') ?? '';
  const described = describedBy
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
    .filter(Boolean);

  // The message the user can see is the message a screen reader is handed.
  expect(container.textContent).toContain(ERROR_MESSAGE);
  expect(described).toContain(ERROR_MESSAGE);
  expect(described).toContain('Helper text');
}

describe('FormControl wiring', () => {
  test('DatePicker', async () => {
    const { container, target } = await submitAndResolveLabelTarget(
      <DatePicker onChange={() => {}} />
    );
    expectWiredUp(container, target, 'button');
  });

  test('MultiSelect', async () => {
    const { container, target } = await submitAndResolveLabelTarget(
      <MultiSelect options={[]} selected={[]} onValueChange={() => {}} />
    );
    expectWiredUp(container, target, 'button');
  });

  test('RichTextEditor', async () => {
    // The editor renders a frame, a toolbar and only then the contenteditable
    // ProseMirror owns. The id has to reach that last element: it is the only
    // one a label can meaningfully point at, and the wrapper it used to be
    // attached to (blog-form's rounded border) is not focusable at all.
    const { container, target } = await submitAndResolveLabelTarget(
      <RichTextEditor compact onChange={() => {}} />,
      '.ProseMirror'
    );
    expectWiredUp(container, target, '[contenteditable="true"][tabindex]');

    // And specifically the writing surface, not something else that happens to
    // be editable.
    expect(target).toBe(container.querySelector('.ProseMirror'));
  });

  test('RichTextEditor tracks the field state after it has mounted', async () => {
    // Tiptap freezes `editorProps` at the value the editor mounted with, so
    // putting these attributes there and stopping would pin the surface to
    // "valid" forever — the state it was created in. `aria-invalid` flipping on
    // the SAME element is what proves the live write is doing its job.
    const container = await mount(
      <RichTextEditor compact onChange={() => {}} />,
      '.ProseMirror'
    );
    const surface = container.querySelector('.ProseMirror');
    expect(surface?.getAttribute('aria-invalid')).toBe('false');

    await submit(container);

    expect(container.querySelector('.ProseMirror')).toBe(surface);
    expect(surface?.getAttribute('aria-invalid')).toBe('true');

    // The write is additive: Tiptap's own attributes on the same element are
    // still there afterwards.
    expect(surface?.getAttribute('contenteditable')).toBe('true');
    expect(surface?.hasAttribute('tabindex')).toBe(true);
  });
});
