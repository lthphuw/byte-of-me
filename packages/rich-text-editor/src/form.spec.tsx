/**
 * `<FormControl>` injects `id`, `aria-describedby` and `aria-invalid` through a Radix `Slot`; a
 * control that does not spread the rest drops all three with no warning or type error. Every case
 * failed that way, driven through a real failed submit rather than `setError`.
 */
import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
  DatePicker,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  MultiSelect,
} from '@byte-of-me/ui-forms';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'bun:test';

import { testEditorLabels } from './editor-labels.test-fixture';
import { RichTextEditor } from './rich-text-editor';

// `@testing-library/react` only auto-registers cleanup under a Jest/Vitest global, not `bun:test`;
// cases use `document.getElementById`, so a leftover render would be found instead.
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
      <DatePicker
        onChange={() => {}}
        placeholder="Pick a date"
        formatDate={() => ''}
      />
    );
    expectWiredUp(container, target, 'button');
  });

  test('MultiSelect', async () => {
    const { container, target } = await submitAndResolveLabelTarget(
      <MultiSelect
        options={[]}
        selected={[]}
        onValueChange={() => {}}
        placeholder="Pick"
        searchPlaceholder="Search"
        emptyLabel="None"
        removeLabel={(label) => label}
      />
    );
    expectWiredUp(container, target, 'button');
  });

  test('RichTextEditor', async () => {
    // The id must reach the contenteditable ProseMirror owns, behind a frame and toolbar: the
    // only element a label can point at (the border wrapper is not focusable).
    const { container, target } = await submitAndResolveLabelTarget(
      <RichTextEditor
        compact
        onChange={() => {}}
        uploadFailedText="Upload failed"
        labels={testEditorLabels}
      />,
      '.ProseMirror'
    );
    expectWiredUp(container, target, '[contenteditable="true"][tabindex]');

    // And specifically the writing surface, not something else that happens to
    // be editable.
    expect(target).toBe(container.querySelector('.ProseMirror'));
  });

  test('RichTextEditor tracks the field state after it has mounted', async () => {
    // Tiptap freezes `editorProps` at mount, so setting these attributes there would pin the surface
    // to "valid". `aria-invalid` flipping on the SAME element proves the live write works.
    const container = await mount(
      <RichTextEditor
        compact
        onChange={() => {}}
        uploadFailedText="Upload failed"
        labels={testEditorLabels}
      />,
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
