import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { DatePicker } from './date-picker';

afterEach(cleanup);

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

describe('DatePicker', () => {
  it('shows the placeholder with no value, in the caller text', () => {
    render(
      <DatePicker
        onChange={() => {}}
        placeholder="Chọn ngày"
        formatDate={formatDate}
      />
    );

    expect(screen.getByRole('button', { name: 'Chọn ngày' })).toBeDefined();
  });

  it('shows the value through the caller formatter', () => {
    render(
      <DatePicker
        value={new Date(2026, 9, 14)}
        onChange={() => {}}
        placeholder="Pick a date"
        formatDate={formatDate}
      />
    );

    expect(screen.getByRole('button', { name: '2026-10-14' })).toBeDefined();
  });

  it('keeps the id and aria attributes a FormControl hands down on the trigger', () => {
    render(
      <DatePicker
        id="start"
        aria-invalid="true"
        onChange={() => {}}
        placeholder="Pick a date"
        formatDate={formatDate}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Pick a date' });
    expect(trigger.id).toBe('start');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });

  it('reports the day that is chosen in the calendar', () => {
    const onChange = mock();
    render(
      <DatePicker
        value={new Date(2026, 9, 14)}
        onChange={onChange}
        placeholder="Pick a date"
        formatDate={formatDate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-10-14' }));
    fireEvent.click(screen.getByRole('button', { name: /October 21st, 2026/ }));

    const chosen = onChange.mock.calls[0]?.[0] as Date;
    expect([chosen.getFullYear(), chosen.getMonth(), chosen.getDate()]).toEqual(
      [2026, 9, 21]
    );
  });
});
