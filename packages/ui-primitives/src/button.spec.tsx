import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { Button } from './button';

afterEach(cleanup);

describe('Button type', () => {
  it('is type="button" by default, so a click never submits a surrounding form', () => {
    render(<Button>Save</Button>);

    expect(
      screen.getByRole('button', { name: 'Save' }).getAttribute('type')
    ).toBe('button');
  });

  it('lets a caller opt into type="submit"', () => {
    render(<Button type="submit">Save</Button>);

    expect(
      screen.getByRole('button', { name: 'Save' }).getAttribute('type')
    ).toBe('submit');
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
  it('carries the 44px touch-target strip at every size', () => {
    for (const size of ['default', 'sm', 'lg', 'icon'] as const) {
      render(<Button size={size}>{size}</Button>);

      const classes = screen.getByRole('button', { name: size }).className;
      expect(classes).toContain('touch-target');
      expect(classes).toContain('relative');
      cleanup();
    }
  });

  it('is one compact height for touch and pointer, with no min-h floor of its own', () => {
    const heights = { default: 'h-8', sm: 'h-7', lg: 'h-9', icon: 'h-8' };
    for (const size of Object.keys(heights) as (keyof typeof heights)[]) {
      render(<Button size={size}>{size}</Button>);

      const classes = screen.getByRole('button', { name: size }).className;
      expect(classes).toContain(heights[size]);
      expect(classes).not.toContain('min-h-11');
      expect(classes).not.toContain('can-hover:min-h');
      cleanup();
    }
  });

  it('is a square on the icon size', () => {
    render(<Button size="icon" aria-label="Edit" />);

    expect(screen.getByRole('button', { name: 'Edit' }).className).toContain(
      'w-8'
    );
  });

  it("lets a caller's height replace the size's", () => {
    render(<Button className="h-6">Small</Button>);

    const classes = screen.getByRole('button', { name: 'Small' }).className;
    expect(classes).toContain('h-6');
    expect(classes).not.toContain('h-8');
  });
});
