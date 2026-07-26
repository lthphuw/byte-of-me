import { cn } from './utils';

describe('cn', () => {
  it('merges conflicting tailwind utilities, last one wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm md:text-base', 'text-lg')).toBe('md:text-base text-lg');
  });

  it('drops falsy conditionals', () => {
    const active = false;
    expect(cn('base', active && 'active', undefined, null)).toBe('base');
  });

  it('flattens arrays and objects clsx-style', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });
});
