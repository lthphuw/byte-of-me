import { cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';

import { AutoGrowingTextarea } from './auto-growing-textarea';

afterEach(cleanup);

// happy-dom lays nothing out, so the content height is 20px a line.
const original = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollHeight'
);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get(this: HTMLTextAreaElement) {
      return (this.value.split('\n').length || 1) * 20;
    },
  });
});
afterAll(() => {
  if (original)
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', original);
});

function box(container: HTMLElement) {
  return container.querySelector('textarea') as HTMLTextAreaElement;
}

describe('AutoGrowingTextarea', () => {
  it('is as tall as its text, and follows it as the value changes', () => {
    const { container, rerender } = render(
      <AutoGrowingTextarea value="one" onChange={() => {}} placeholder="Say" />
    );
    expect(box(container).style.height).toBe('20px');

    rerender(
      <AutoGrowingTextarea
        value={'one\ntwo\nthree'}
        onChange={() => {}}
        placeholder="Say"
      />
    );
    expect(box(container).style.height).toBe('60px');

    rerender(
      <AutoGrowingTextarea value="" onChange={() => {}} placeholder="Say" />
    );
    expect(box(container).style.height).toBe('20px');
  });

  it('scrolls, rather than hides, what passes its maximum height', () => {
    const { container } = render(
      <AutoGrowingTextarea value="x" onChange={() => {}} placeholder="Say" />
    );

    expect(box(container).className).toContain('overflow-y-auto');
    expect(box(container).className).not.toContain('overflow-hidden');
  });
});
