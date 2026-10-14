import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { TagClickableBadge } from './tag-clickable-badge';

import type { PublicTag } from '@/entities/tag/model/types';

const tag = { id: 't1', slug: 'vision', name: 'Vision' } as PublicTag;

afterEach(cleanup);

describe('TagClickableBadge', () => {
  it('is a button a keyboard can reach, and it reports its slug when pressed', () => {
    const onClick = mock();
    render(<TagClickableBadge tag={tag} onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Vision' });
    expect(button.tagName).toBe('BUTTON');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledWith('vision');
  });

  it('says whether the filter is on, in the accessible tree', () => {
    const { rerender } = render(
      <TagClickableBadge tag={tag} onClick={() => {}} />
    );
    expect(
      screen
        .getByRole('button', { name: 'Vision' })
        .getAttribute('aria-pressed')
    ).toBe('false');

    rerender(<TagClickableBadge tag={tag} active onClick={() => {}} />);
    expect(
      screen
        .getByRole('button', { name: 'Vision' })
        .getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('is plain text, not a dead button, when nothing handles the click', () => {
    render(<TagClickableBadge tag={tag} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Vision')).toBeDefined();
  });
});
