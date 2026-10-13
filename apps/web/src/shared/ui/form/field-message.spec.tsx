import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem } from '@byte-of-me/ui';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../messages/en.json';

import { FieldMessage } from './field-message';

afterEach(() => {
  cleanup();
});

/**
 * One field with a control and the message beneath it. The error is set
 * through `setError`, so `FormControl` sees the field as invalid, as it does
 * after a real failed submit.
 */
function Harness({ message }: { message?: string }) {
  const form = useForm<{ name: string }>({ defaultValues: { name: '' } });

  useEffect(() => {
    if (message) form.setError('name', { type: 'custom', message });
  }, [form, message]);

  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <Form {...form}>
        <FormField
          control={form.control}
          name="name"
          render={({ fieldState }) => (
            <FormItem>
              <FormControl>
                <input aria-label="Name" />
              </FormControl>
              <FieldMessage message={fieldState.error?.message} />
            </FormItem>
          )}
        />
      </Form>
    </NextIntlClientProvider>
  );
}

describe('FieldMessage', () => {
  it('translates a validation key through dashboard.validation', () => {
    render(<Harness message="validation.required" />);

    expect(screen.queryByText('This field is required')).not.toBeNull();
  });

  it('shows a plain message unchanged', () => {
    render(<Harness message="Use a shorter title" />);

    expect(screen.queryByText('Use a shorter title')).not.toBeNull();
  });

  it('renders nothing without a message', () => {
    const { container } = render(<Harness />);

    expect(container.textContent).toBe('');
  });

  it('is the element the control names in aria-describedby', () => {
    render(<Harness message="validation.required" />);

    const control = screen.getByRole('textbox', { name: 'Name' });
    const message = screen.getByText('This field is required');
    const described = control.getAttribute('aria-describedby') ?? '';

    expect(described.split(' ')).toContain(message.id);
  });
});
