import type { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// eslint-disable-next-line import-alias/import-alias
import { Storage } from '../src/storage';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('Storage', () => {
  const mockSend = jest.fn();

  const mockClient = {
    send: mockSend,
  } as unknown as S3Client;

  const config = {
    region: 'us-east-1',
    bucket: 'test-bucket',
    publicEndpoint: 'http://localhost:9000',
  };

  let storage: Storage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new Storage(config, mockClient);
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
      (getSignedUrl as jest.Mock).mockResolvedValueOnce('signed-url');

      const result = await storage.getPresignedUploadUrl('file.txt', 60);

      expect(getSignedUrl).toHaveBeenCalled();
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

    it('getPresignedUploadUrl forwards expiresIn', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValueOnce('signed');

      await storage.getPresignedUploadUrl('up.bin', 120);

      expect(getSignedUrl).toHaveBeenCalledWith(
        mockClient,
        expect.anything(),
        { expiresIn: 120 }
      );
    });
  });
});
