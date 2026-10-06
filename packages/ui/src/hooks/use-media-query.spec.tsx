import { renderToString } from 'react-dom/server';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { useMediaQuery } from './use-media-query';

const NARROW = '(max-width: 640px)';

function Probe({ onRender }: { onRender?: (value: boolean) => void }) {
  const matches = useMediaQuery(NARROW);
  onRender?.(matches);
  return <span>{String(matches)}</span>;
}

// happy-dom's own handle on the registered window; it is not in `lib.dom`.
const { happyDOM } = window as unknown as {
  happyDOM: { setViewport(viewport: { width: number; height: number }): void };
};

function setWidth(width: number) {
  act(() => {
    happyDOM.setViewport({ width, height: 800 });
  });
}

describe('useMediaQuery', () => {
  afterEach(() => setWidth(1024));

  it('reads the real value in the first client render', () => {
    setWidth(500);
    const seen: boolean[] = [];

    render(<Probe onRender={(value) => seen.push(value)} />);

    expect(seen[0]).toBe(true);
  });

  it('follows the query as it starts and stops matching', () => {
    setWidth(1024);
    const { container } = render(<Probe />);
    expect(container.textContent).toBe('false');

    setWidth(500);
    expect(container.textContent).toBe('true');

    setWidth(1024);
    expect(container.textContent).toBe('false');
  });

  it('reports false when rendered on the server, even if the query matches', () => {
    setWidth(500);

    expect(renderToString(<Probe />)).toContain('false');
  });
});
