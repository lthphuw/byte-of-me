import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Bold } from 'lucide-react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { TooltipProvider } from '../../../tooltip';

import { formatShortcut, ToolbarButton } from './toolbar-button';

afterEach(cleanup);

describe('formatShortcut', () => {
  it('draws a chord with symbols on a Mac and with names elsewhere', () => {
    expect(formatShortcut('Mod-Shift-s', true)).toBe('⌘⇧S');
    expect(formatShortcut('Mod-Alt-c', true)).toBe('⌘⌥C');
    expect(formatShortcut('Mod-Shift-s', false)).toBe('Ctrl+Shift+S');
    expect(formatShortcut('Mod-b', false)).toBe('Ctrl+B');
  });
});

function setup(
  props: Partial<React.ComponentProps<typeof ToolbarButton>> = {}
) {
  return render(
    <TooltipProvider>
      <ToolbarButton icon={Bold} label="Bold" shortcut="Mod-b" {...props} />
    </TooltipProvider>
  );
}

describe('ToolbarButton', () => {
  it('is named by its label and says whether it is on', () => {
    setup({ active: true });

    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.className).toContain('bg-accent');
  });

  it('is off, not unpressable, when inactive', () => {
    setup({ active: false });

    expect(
      screen.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed')
    ).toBe('false');
  });

  it('carries no pressed state for a control that is not a toggle', () => {
    setup();

    expect(
      screen.getByRole('button', { name: 'Bold' }).hasAttribute('aria-pressed')
    ).toBe(false);
  });

  it('shows the shortcut in the tooltip', async () => {
    setup();

    fireEvent.focus(screen.getByRole('button', { name: 'Bold' }));

    expect((await screen.findAllByText(/Ctrl\+B|⌘B/)).length).toBeGreaterThan(
      0
    );
  });

  it('passes a click on, and not when disabled', () => {
    const onClick = mock();
    const { rerender } = setup({ onClick });

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <TooltipProvider>
        <ToolbarButton icon={Bold} label="Bold" onClick={onClick} disabled />
      </TooltipProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
