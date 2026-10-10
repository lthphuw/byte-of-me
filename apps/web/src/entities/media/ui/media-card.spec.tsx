/**
 * What the media library shows for entries that are not images: a clip is a muted
 * metadata-only `<video>` thumbnail (never a broken `<img>`), and anything else is
 * a type placeholder. Renders the real card. The image branch is `next/image`,
 * which needs Next's runtime config and cannot render under `bun test`.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { MediaCard } from './media-card';

import type { Media } from '@/shared/types/models';

const media = (overrides: Partial<Media>): Media => ({
  id: 'm1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  fileName: 'int8.mp4',
  fileKey: 'users/u/media/featured-work/2026/10/x.mp4',
  mimeType: 'video/mp4',
  size: 1024,
  provider: 'SUPABASE',
  bucket: 'media',
  url: 'https://cdn.example/x.mp4',
  ...overrides,
});

afterEach(cleanup);

describe('MediaCard', () => {
  it.each(['video/mp4', 'video/webm'])('shows a %s entry as a muted metadata-only video, never an img', (mimeType) => {
    const { container } = render(<MediaCard media={media({ mimeType })} />);

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('preload')).toBe('metadata');
    expect(video?.muted).toBe(true);
    expect(video?.hasAttribute('controls')).toBe(false);
    expect(video?.getAttribute('src')).toBe('https://cdn.example/x.mp4#t=0.1');
    expect(video?.getAttribute('aria-label')).toBe('int8.mp4');
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows a placeholder, not a broken img, for a file that is neither', () => {
    const { container, getByText } = render(
      <MediaCard media={media({ mimeType: 'application/pdf', fileName: 'a.pdf' })} />
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('video')).toBeNull();
    expect(getByText('pdf')).toBeTruthy();
  });
});
