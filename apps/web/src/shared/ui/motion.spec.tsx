import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

import { RevealItem, RevealSection } from './motion';

// `opacity:0` in the server HTML is what keeps Chrome from counting an element
// as the LCP candidate until JS has hydrated and played the reveal.
describe('RevealSection', () => {
  it('is hidden in the server HTML by default', () => {
    const html = renderToString(<RevealSection>Hero</RevealSection>);

    expect(html).toContain('opacity:0');
  });

  it('is visible in the server HTML when immediate', () => {
    const html = renderToString(<RevealSection immediate>Hero</RevealSection>);

    expect(html).toContain('Hero');
    expect(html).not.toContain('opacity:0');
  });

  it('stays visible through hydration when immediate', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(
      <RevealSection immediate>Hero</RevealSection>
    );
    document.body.appendChild(container);

    await act(async () => {
      hydrateRoot(container, <RevealSection immediate>Hero</RevealSection>);
    });

    expect((container.firstElementChild as HTMLElement).style.opacity).toBe('');
  });

  it('still reveals when mounted on the client after hydration', () => {
    const { container } = render(<RevealSection immediate>Hero</RevealSection>);

    expect((container.firstElementChild as HTMLElement).style.opacity).toBe('0');
  });
});

describe('RevealItem', () => {
  it('is hidden in the server HTML by default, visible when immediate', () => {
    expect(renderToString(<RevealItem>Card</RevealItem>)).toContain('opacity:0');
    expect(renderToString(<RevealItem immediate>Card</RevealItem>)).not.toContain(
      'opacity:0'
    );
  });
});
