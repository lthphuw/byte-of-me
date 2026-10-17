/**
 * Removing a role asks first once it holds anything the removal would lose, and
 * the answer must follow what the author types, not the state at mount.
 */
import { useForm } from 'react-hook-form';
import type { CompanyFormValues } from '@byte-of-me/contracts/company';
import { Form } from '@byte-of-me/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import { CompanyRoleItemField } from './company-role-item-field';

type Role = CompanyFormValues['roles'][number];

const blankRole: Role = {
  startDate: null,
  endDate: null,
  translations: [{ language: 'en', title: '', description: '' }],
  tasks: [],
};

function renderRole(role: Role, remove = mock<(index: number) => void>()) {
  function Harness() {
    const form = useForm<CompanyFormValues>({
      defaultValues: {
        company: '',
        location: '',
        startDate: new Date('2021-03-01T00:00:00.000Z'),
        endDate: null,
        translations: [],
        techStackIds: [],
        roles: [role],
      },
    });

    return (
      <Form {...form}>
        <CompanyRoleItemField
          index={0}
          control={form.control}
          remove={remove}
        />
      </Form>
    );
  }

  render(
    <NextIntlClientProvider locale="en" messages={{ dashboard: en.dashboard }}>
      <Harness />
    </NextIntlClientProvider>
  );

  return remove;
}

const removeButton = () =>
  screen.getByRole('button', { name: en.dashboard.company.role.removeButton });
const confirmTitle = () =>
  screen.queryByText(en.dashboard.company.role.removeConfirmTitle);

afterEach(cleanup);

describe('CompanyRoleItemField removal', () => {
  it('removes an untouched role without asking', () => {
    const remove = renderRole(blankRole);

    fireEvent.click(removeButton());

    expect(remove).toHaveBeenCalledWith(0);
    expect(confirmTitle()).toBeNull();
  });

  it('asks once a title is typed, and removes only on confirm', () => {
    const remove = renderRole(blankRole);

    fireEvent.change(
      screen.getByLabelText(en.dashboard.company.role.titleLabel),
      {
        target: { value: 'Staff Engineer' },
      }
    );
    fireEvent.click(removeButton());

    expect(confirmTitle()).not.toBeNull();
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(remove).toHaveBeenCalledWith(0);
  });

  it('asks when the only text is in a language other than the first', () => {
    renderRole({
      ...blankRole,
      translations: [
        { language: 'en', title: '', description: '' },
        { language: 'vi', title: 'Kỹ sư phần mềm', description: '' },
      ],
    });

    fireEvent.click(removeButton());

    expect(confirmTitle()).not.toBeNull();
  });

  it('asks when the role has a task, even with no title', () => {
    renderRole({
      ...blankRole,
      tasks: [
        {
          sortOrder: 0,
          translations: [
            { language: 'en', content: 'Shipped the billing API' },
          ],
        },
      ],
    });

    fireEvent.click(removeButton());

    expect(confirmTitle()).not.toBeNull();
  });
});
