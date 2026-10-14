import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { Button } from './button';

afterEach(cleanup);

describe('Button type', () => {
  it('is type="button" by default, so a click never submits a surrounding form', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('type')).toBe(
      'button'
    );
  });

  it('lets a caller opt into type="submit"', () => {
    render(<Button type="submit">Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('type')).toBe(
      'submit'
    );
  });

  it('puts no type attribute on the anchor it renders under asChild', () => {
    render(
      <Button asChild>
        <a href="/projects">Projects</a>
      </Button>
    );

    expect(
      screen.getByRole('link', { name: 'Projects' }).hasAttribute('type')
    ).toBe(false);
  });
});

describe('Button touch target', () => {
  it('is 44px tall on touch at every size, with a pointer-size floor under can-hover', () => {
    for (const size of ['default', 'sm', 'lg', 'icon'] as const) {
      render(<Button size={size}>{size}</Button>);

      const classes = screen.getByRole('button', { name: size }).className;
      expect(classes).toContain('min-h-11');
      expect(classes).toMatch(/can-hover:min-h-\d+/);
      cleanup();
    }
  });

  it('keeps the 44px width floor on the icon size', () => {
    render(<Button size="icon" aria-label="Edit" />);

    expect(screen.getByRole('button', { name: 'Edit' }).className).toContain(
      'min-w-11'
    );
  });

  it("lets a caller's min-h replace the pointer floor", () => {
    render(<Button className="can-hover:min-h-7">Small</Button>);

    const classes = screen.getByRole('button', { name: 'Small' }).className;
    expect(classes).toContain('can-hover:min-h-7');
    expect(classes).not.toContain('can-hover:min-h-9');
  });
});
