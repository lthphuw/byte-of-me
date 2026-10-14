import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, mock } from 'bun:test';

import { useImageUpload } from './use-image-upload';

const file = new File(['x'], 'shot.png', { type: 'image/png' });

describe('useImageUpload with an uploader', () => {
  it('hands the uploaded address and the file on, and is not left uploading', async () => {
    const onUpload = mock();
    const { result } = renderHook(() =>
      useImageUpload({
        uploadFn: async () => 'https://cdn.test/shot.png',
        uploadFailedText: 'Upload failed',
        onUpload,
      })
    );

    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(onUpload).toHaveBeenCalledWith('https://cdn.test/shot.png', file);
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("shows the uploader's own reason when it refuses, and inserts nothing", async () => {
    const onUpload = mock();
    const { result } = renderHook(() =>
      useImageUpload({
        uploadFn: async () => {
          throw new Error('"shot.png" is larger than 3 MB.');
        },
        uploadFailedText: 'Upload failed',
        onUpload,
      })
    );

    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(onUpload).not.toHaveBeenCalled();
    expect(result.current.error).toBe('"shot.png" is larger than 3 MB.');
  });

  it('falls back to the translated text when the refusal has no message', async () => {
    const { result } = renderHook(() =>
      useImageUpload({
        uploadFn: () => Promise.reject(new Error('')),
        uploadFailedText: 'Upload failed',
      })
    );

    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(result.current.error).toBe('Upload failed');
  });

  it('clears the error with reset', async () => {
    const { result } = renderHook(() =>
      useImageUpload({
        uploadFn: () => Promise.reject(new Error('nope')),
        uploadFailedText: 'Upload failed',
      })
    );
    await act(async () => {
      await result.current.uploadFile(file);
    });

    act(() => result.current.reset());

    expect(result.current.error).toBeNull();
  });
});

describe('useImageUpload without an uploader', () => {
  it('hands on a local address for the image node to upload, without revoking it', async () => {
    const created: string[] = [];
    const revoked: string[] = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => {
      created.push('blob:local/1');
      return 'blob:local/1';
    };
    URL.revokeObjectURL = (url) => void revoked.push(url);

    try {
      const onUpload = mock();
      const { result } = renderHook(() =>
        useImageUpload({ uploadFailedText: 'Upload failed', onUpload })
      );

      await act(async () => {
        await result.current.uploadFile(file);
      });

      expect(onUpload).toHaveBeenCalledWith('blob:local/1', file);
      expect(revoked).toEqual([]);
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});
