import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import type { ResizablePanel, UseResizablePanelParams } from './use-resizable-panel';
import { useResizablePanel } from './use-resizable-panel';

const STORAGE_KEY = 'byte-of-me:test-panel';
const MIN = 160;
const MAX = 480;
const DEFAULT_WIDTH = 240;

/**
 * Renders the separator for real rather than calling the handlers directly:
 * spreading `separatorProps` onto a `<div>` is itself part of the contract,
 * and pointer capture only means anything on a mounted element.
 */
function setup(overrides: Partial<UseResizablePanelParams> = {}) {
  const params: UseResizablePanelParams = {
    storageKey: STORAGE_KEY,
    min: MIN,
    max: MAX,
    defaultWidth: DEFAULT_WIDTH,
    ...overrides,
  };

  const latest: { panel: ResizablePanel | null } = { panel: null };

  function Harness() {
    const panel = useResizablePanel(params);
    latest.panel = panel;
    return <div data-testid="separator" {...panel.separatorProps} />;
  }

  const view = render(<Harness />);

  return {
    ...view,
    separator: view.getByTestId('separator'),
    panel: () => {
      if (!latest.panel) throw new Error('harness never rendered');
      return latest.panel;
    },
  };
}

/** One complete gesture: press at `from`, move to `to`, release. */
function drag(separator: HTMLElement, from: number, to: number, pointerId = 1) {
  fireEvent.pointerDown(separator, { pointerId, button: 0, clientX: from });
  fireEvent.pointerMove(separator, { pointerId, clientX: to });
  fireEvent.pointerUp(separator, { pointerId, clientX: to });
}

function press(separator: HTMLElement, key: string) {
  fireEvent.keyDown(separator, { key });
}

describe('useResizablePanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.body.style.userSelect = '';
  });

  // bun:test does not trigger RTL's auto-cleanup, so trees would otherwise
  // stack up in `document.body` across tests.
  afterEach(cleanup);

  it('opens at the default width and publishes the separator contract', () => {
    const { separator, panel } = setup();

    expect(panel().width).toBe(DEFAULT_WIDTH);
    expect(panel().isCollapsed).toBe(false);

    expect(separator.getAttribute('role')).toBe('separator');
    expect(separator.getAttribute('aria-orientation')).toBe('vertical');
    expect(separator.getAttribute('aria-valuenow')).toBe(String(DEFAULT_WIDTH));
    expect(separator.getAttribute('aria-valuemin')).toBe(String(MIN));
    expect(separator.getAttribute('aria-valuemax')).toBe(String(MAX));
    expect(separator.tabIndex).toBe(0);
  });

  it('resizes by the pointer delta and reports it through aria-valuenow', () => {
    const { separator, panel } = setup();

    drag(separator, 300, 360);

    expect(panel().width).toBe(DEFAULT_WIDTH + 60);
    expect(separator.getAttribute('aria-valuenow')).toBe(String(DEFAULT_WIDTH + 60));
  });

  describe("edge: 'end'", () => {
    it('narrows when the pointer moves right, because the panel is on the right', () => {
      const { separator, panel } = setup({ edge: 'end' });

      drag(separator, 400, 460);

      // The default direction would make this 300. A right-anchored panel
      // whose separator is pushed INTO it must shrink, or the panel reads as
      // fighting the pointer.
      expect(panel().width).toBe(DEFAULT_WIDTH - 60);
    });

    it('widens when the pointer moves left', () => {
      const { separator, panel } = setup({ edge: 'end' });

      drag(separator, 400, 360);

      expect(panel().width).toBe(DEFAULT_WIDTH + 40);
    });

    it('flips the arrow keys too, so both panels answer the same gesture', () => {
      const { separator, panel } = setup({ edge: 'end' });

      press(separator, 'ArrowLeft');

      expect(panel().width).toBe(DEFAULT_WIDTH + 16);
    });

    it('leaves Home and End meaning the bounds, not the direction', () => {
      const { separator, panel } = setup({ edge: 'end' });

      press(separator, 'End');
      expect(panel().width).toBe(MAX);

      press(separator, 'Home');
      expect(panel().width).toBe(MIN);
    });
  });

  it('clamps a drag at both ends', () => {
    const { separator, panel } = setup();

    fireEvent.pointerDown(separator, { pointerId: 1, button: 0, clientX: 300 });

    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 5000 });
    expect(panel().width).toBe(MAX);

    fireEvent.pointerMove(separator, { pointerId: 1, clientX: -5000 });
    expect(panel().width).toBe(MIN);

    fireEvent.pointerUp(separator, { pointerId: 1, clientX: -5000 });
    expect(panel().width).toBe(MIN);
  });

  it('ignores a pointermove that no pointerdown started', () => {
    const { separator, panel } = setup();

    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 5000 });

    expect(panel().width).toBe(DEFAULT_WIDTH);
  });

  it('captures the pointer on the separator and releases it on pointerup', () => {
    const { separator } = setup();

    fireEvent.pointerDown(separator, { pointerId: 3, button: 0, clientX: 300 });
    expect(separator.hasPointerCapture(3)).toBe(true);

    fireEvent.pointerUp(separator, { pointerId: 3, clientX: 300 });
    expect(separator.hasPointerCapture(3)).toBe(false);
  });

  it('suppresses text selection for the duration of the drag', () => {
    const { separator } = setup();

    fireEvent.pointerDown(separator, { pointerId: 1, button: 0, clientX: 300 });
    expect(document.body.style.userSelect).toBe('none');

    fireEvent.pointerUp(separator, { pointerId: 1, clientX: 300 });
    expect(document.body.style.userSelect).toBe('');
  });

  it('restores text selection when the panel unmounts mid-drag', () => {
    const { separator, unmount } = setup();

    fireEvent.pointerDown(separator, { pointerId: 1, button: 0, clientX: 300 });
    expect(document.body.style.userSelect).toBe('none');

    unmount();

    expect(document.body.style.userSelect).toBe('');
  });

  it('nudges by 16px per arrow key and stops at the clamps', () => {
    const { separator, panel } = setup();

    press(separator, 'ArrowRight');
    expect(panel().width).toBe(DEFAULT_WIDTH + 16);

    press(separator, 'ArrowLeft');
    press(separator, 'ArrowLeft');
    expect(panel().width).toBe(DEFAULT_WIDTH - 16);

    for (let i = 0; i < 40; i += 1) press(separator, 'ArrowRight');
    expect(panel().width).toBe(MAX);

    for (let i = 0; i < 40; i += 1) press(separator, 'ArrowLeft');
    expect(panel().width).toBe(MIN);
  });

  it('jumps to the bounds with Home and End', () => {
    const { separator, panel } = setup();

    press(separator, 'End');
    expect(panel().width).toBe(MAX);

    press(separator, 'Home');
    expect(panel().width).toBe(MIN);
  });

  it('leaves keys it does not handle to the page', () => {
    const { separator, panel } = setup();

    const handled = fireEvent.keyDown(separator, { key: 'ArrowRight' });
    const untouched = fireEvent.keyDown(separator, { key: 'Tab' });

    // fireEvent returns false once a listener has called preventDefault.
    expect(handled).toBe(false);
    expect(untouched).toBe(true);
    expect(panel().width).toBe(DEFAULT_WIDTH + 16);
  });

  it('resets to the default width on a double-click', () => {
    const { separator, panel } = setup();

    drag(separator, 300, 400);
    expect(panel().width).not.toBe(DEFAULT_WIDTH);

    fireEvent.doubleClick(separator);

    expect(panel().width).toBe(DEFAULT_WIDTH);
  });

  it('restores the pre-collapse width, not the default, when expanded again', () => {
    const { separator, panel } = setup();

    drag(separator, 300, 380);
    const chosen = panel().width;
    expect(chosen).toBe(DEFAULT_WIDTH + 80);

    act(() => panel().setCollapsed(true));
    expect(panel().isCollapsed).toBe(true);
    expect(panel().width).toBe(chosen);

    act(() => panel().setCollapsed(false));
    expect(panel().isCollapsed).toBe(false);
    expect(panel().width).toBe(chosen);
  });

  it('carries the width and the collapsed flag into the next mount', () => {
    const first = setup();
    drag(first.separator, 300, 390);
    act(() => first.panel().setCollapsed(true));
    first.unmount();

    const second = setup();

    expect(second.panel().width).toBe(DEFAULT_WIDTH + 90);
    expect(second.panel().isCollapsed).toBe(true);
  });

  it('clamps a stored width that falls outside the current bounds', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ width: MAX + 4000, collapsed: false })
    );
    const tooWide = setup();
    expect(tooWide.panel().width).toBe(MAX);
    tooWide.unmount();

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ width: 1, collapsed: false })
    );
    expect(setup().panel().width).toBe(MIN);
  });

  it('falls back to the default width when storage holds corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"width": 3');

    const { panel } = setup();

    expect(panel().width).toBe(DEFAULT_WIDTH);
    expect(panel().isCollapsed).toBe(false);
  });

  it('ignores a stored width that is not a usable number', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ width: 'wide', collapsed: true })
    );

    const { panel } = setup();

    // The unusable field is dropped; the readable one still applies.
    expect(panel().width).toBe(DEFAULT_WIDTH);
    expect(panel().isCollapsed).toBe(true);
  });
});
