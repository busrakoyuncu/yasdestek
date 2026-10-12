import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

const client = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  getObject: jest.fn(),
  getPartialObject: jest.fn(),
  removeObject: jest.fn(),
};

jest.mock('minio', () => {
  class S3Error extends Error {
    constructor(public code: string) {
      super(code);
    }
  }
  return { Client: jest.fn(() => client), S3Error };
});

const config = {
  getOrThrow: (key: string) =>
    ({
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: '9000',
      MINIO_ACCESS_KEY: 'k',
      MINIO_SECRET_KEY: 's',
      MINIO_BUCKET: 'media',
    })[key],
} as unknown as ConfigService;

describe('StorageService', () => {
  const service = new StorageService(config);

  beforeEach(() => jest.clearAllMocks());

  it('creates the bucket on startup only when it is missing', async () => {
    client.bucketExists.mockResolvedValueOnce(false);
    await service.onModuleInit();
    expect(client.makeBucket).toHaveBeenCalledWith('media');

    client.bucketExists.mockResolvedValueOnce(true);
    await service.onModuleInit();
    expect(client.makeBucket).toHaveBeenCalledTimes(1);
  });

  it('tolerates losing the creation race, rethrows anything else', async () => {
    const { S3Error } = jest.requireMock<{
      S3Error: new (code: string) => Error;
    }>('minio');

    client.bucketExists.mockResolvedValueOnce(false);
    client.makeBucket.mockRejectedValueOnce(
      new S3Error('BucketAlreadyOwnedByYou'),
    );
    await expect(service.onModuleInit()).resolves.toBeUndefined();

    client.bucketExists.mockResolvedValueOnce(false);
    client.makeBucket.mockRejectedValueOnce(new S3Error('AccessDenied'));
    await expect(service.onModuleInit()).rejects.toThrow('AccessDenied');
  });

  it('stores with the mime type and reads ranges by offset and length', async () => {
    client.putObject.mockResolvedValueOnce({});
    await service.put('k1', Buffer.from('abc'), 'image/png');
    expect(client.putObject).toHaveBeenCalledWith(
      'media',
      'k1',
      expect.any(Buffer),
      3,
      { 'Content-Type': 'image/png' },
    );

    await service.get('k1', { start: 100, end: 199 });
    expect(client.getPartialObject).toHaveBeenCalledWith(
      'media',
      'k1',
      100,
      100,
    );

    await service.get('k1');
    expect(client.getObject).toHaveBeenCalledWith('media', 'k1');
  });
});
