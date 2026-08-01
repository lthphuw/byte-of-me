import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

import { Button } from './button';

describe('Button', () => {
  it('renders its children and forwards the disabled attribute', () => {
    render(<Button disabled>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDefined();
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
