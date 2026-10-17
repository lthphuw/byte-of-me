import { renderToString } from 'react-dom/server';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

import { useHydrated } from './use-hydrated';

function Probe() {
  return <span>{String(useHydrated())}</span>;
}

describe('useHydrated', () => {
  it('is false in the server render, so the HTML matches the static page', () => {
    expect(renderToString(<Probe />)).toContain('false');
  });

  it('is true once the component is mounted in the browser', () => {
    const { container } = render(<Probe />);

    expect(container.textContent).toBe('true');
  });
});
