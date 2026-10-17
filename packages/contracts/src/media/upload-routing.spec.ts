/**
 * Which path a file takes: a clip goes browser → storage through a presigned URL,
 * an image goes through `uploadMedia`, and a file over its own ceiling takes neither.
 */
import { describe, expect, it } from 'bun:test';

import { pickUploadPath } from './upload-constraints';

const MiB = 1024 * 1024;

describe('pickUploadPath', () => {
  it('sends a 6 MB clip down the direct path, past the 4.5 MB action body limit', () => {
    expect(pickUploadPath({ type: 'video/mp4', size: 6 * MiB })).toEqual({
      path: 'direct',
    });
  });

  it('sends a 2 MB image through the server action', () => {
    expect(pickUploadPath({ type: 'image/png', size: 2 * MiB })).toEqual({
      path: 'action',
    });
  });

  it('refuses a 4 MB image, which is over the 3 MB image ceiling', () => {
    expect(pickUploadPath({ type: 'image/png', size: 4 * MiB })).toEqual({
      error: 'too-large',
    });
  });

  it('keeps a clip at exactly 15 MB on the direct path and refuses one byte more', () => {
    expect(pickUploadPath({ type: 'video/webm', size: 15 * MiB })).toEqual({
      path: 'direct',
    });
    expect(
      pickUploadPath({ type: 'video/webm', size: 15 * MiB + 1 })
    ).toEqual({ error: 'too-large' });
  });
});
