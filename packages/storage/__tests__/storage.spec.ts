import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { S3Client } from '@aws-sdk/client-s3';

// eslint-disable-next-line import-alias/import-alias
import { Storage } from '../src/storage';

describe('Storage', () => {
  const mockSend = mock();
  const mockSignUrl = mock();

  const mockClient = { send: mockSend } as unknown as S3Client;

  const config = {
    region: 'us-east-1',
    bucket: 'test-bucket',
    publicEndpoint: 'http://localhost:9000',
  };

  let storage: Storage;

  beforeEach(() => {
    mockSend.mockReset();
    mockSignUrl.mockReset();
    storage = new Storage(config, mockClient, mockSignUrl as never);
  });

  describe('uploadFile', () => {
    it('should upload file and return key', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await storage.uploadFile({
        fileKey: 'file.txt',
        body: 'data',
      });

      expect(mockSend).toHaveBeenCalled();
      expect(result).toEqual({ fileKey: 'file.txt' });
    });
  });

  describe('deleteFile', () => {
    it('should call delete command', async () => {
      mockSend.mockResolvedValueOnce({});

      await storage.deleteFile('file.txt');

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('getPublicUrl', () => {
    it('should return correct public url', () => {
      const url = storage.getPublicUrl('file.txt');

      expect(url).toBe('http://localhost:9000/test-bucket/file.txt');
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('should return signed url', async () => {
      mockSignUrl.mockResolvedValueOnce('signed-url');

      const result = await storage.getPresignedUploadUrl('file.txt', 60);

      expect(mockSignUrl).toHaveBeenCalled();
      expect(result).toBe('signed-url');
    });
  });

  describe('config normalization', () => {
    it('strips a trailing slash off publicEndpoint', () => {
      const slashed = new Storage(
        { ...config, publicEndpoint: 'http://localhost:9000/' },
        mockClient
      );

      expect(slashed.getPublicUrl('a.png')).toBe(
        'http://localhost:9000/test-bucket/a.png'
      );
    });
  });

  describe('command wiring', () => {
    it('uploadFile sends bucket, key and content type', async () => {
      mockSend.mockResolvedValueOnce({});

      await storage.uploadFile({
        fileKey: 'img.png',
        body: 'data',
        contentType: 'image/png',
      });

      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'img.png',
          ContentType: 'image/png',
        })
      );
    });

    it('deleteFile targets the right bucket and key', async () => {
      mockSend.mockResolvedValueOnce({});

      await storage.deleteFile('old.txt');

      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({ Bucket: 'test-bucket', Key: 'old.txt' })
      );
    });

    it('getFile targets the right bucket and key', async () => {
      const stream = {} as ReadableStream;
      mockSend.mockResolvedValueOnce({
        Body: { transformToWebStream: () => stream },
        ContentType: 'application/pdf',
        ContentLength: 42,
      });

      const result = await storage.getFile('users/u1/notes/n1/doc.pdf');

      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'users/u1/notes/n1/doc.pdf',
        })
      );
      // Identity, not equality: the point is that the SDK's stream is handed
      // through untouched, so a route can pipe it without buffering.
      expect(result.body).toBe(stream);
      expect(result.contentType).toBe('application/pdf');
      expect(result.contentLength).toBe(42);
    });

    it('getFile survives an object with no body', async () => {
      // S3 can answer a GET with no `Body` — a zero-byte object, or a response
      // the SDK could not stream. Returning `undefined` lets the caller answer
      // 404 instead of throwing a TypeError inside a route handler.
      mockSend.mockResolvedValueOnce({ ContentType: 'application/pdf' });

      const result = await storage.getFile('empty.pdf');

      expect(result.body).toBeUndefined();
    });

    it('copyFileFrom URL-encodes the source and keeps the destination raw', async () => {
      mockSend.mockResolvedValueOnce({});

      await storage.copyFileFrom(
        'public-bucket',
        'users/u1/media/2026/my file.png',
        'users/u1/notes/n1/my file.png'
      );

      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: 'test-bucket',
          CopySource: 'public-bucket/users/u1/media/2026/my%20file.png',
          Key: 'users/u1/notes/n1/my file.png',
        })
      );
    });

    it('getPresignedUploadUrl forwards expiresIn', async () => {
      mockSignUrl.mockResolvedValueOnce('signed');

      await storage.getPresignedUploadUrl('up.bin', 120);

      expect(mockSignUrl).toHaveBeenCalledWith(
        mockClient,
        expect.anything(),
        { expiresIn: 120 }
      );
    });
  });
});
