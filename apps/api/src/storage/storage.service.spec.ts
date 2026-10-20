import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

const send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const command = (name: string) =>
    class {
      readonly name = name;
      constructor(readonly input: Record<string, unknown>) {}
    };
  class S3ServiceException extends Error {
    constructor(readonly $metadata: { httpStatusCode: number }) {
      super(`http ${$metadata.httpStatusCode}`);
    }
  }
  return {
    S3Client: jest.fn(() => ({ send })),
    S3ServiceException,
    HeadBucketCommand: command('HeadBucket'),
    CreateBucketCommand: command('CreateBucket'),
    PutObjectCommand: command('PutObject'),
    GetObjectCommand: command('GetObject'),
    DeleteObjectCommand: command('DeleteObject'),
  };
});

const { S3ServiceException } = jest.requireMock<{
  S3ServiceException: new (meta: { httpStatusCode: number }) => Error;
}>('@aws-sdk/client-s3');

const config = {
  getOrThrow: (key: string) =>
    ({
      S3_ENDPOINT: 'http://localhost:3900',
      S3_REGION: 'garage',
      S3_ACCESS_KEY: 'k',
      S3_SECRET_KEY: 's',
      S3_BUCKET: 'media',
    })[key],
} as unknown as ConfigService;

const commands = () =>
  send.mock.calls.map(([c]: [{ name: string; input: unknown }]) => [
    c.name,
    c.input,
  ]);

describe('StorageService', () => {
  const service = new StorageService(config);

  beforeEach(() => send.mockReset());

  it('creates the bucket on startup only when it is missing', async () => {
    send.mockResolvedValueOnce({});
    await service.onModuleInit();
    expect(commands()).toEqual([['HeadBucket', { Bucket: 'media' }]]);

    send.mockReset();
    send
      .mockRejectedValueOnce(new S3ServiceException({ httpStatusCode: 404 }))
      .mockResolvedValueOnce({});
    await service.onModuleInit();
    expect(commands()[1]).toEqual(['CreateBucket', { Bucket: 'media' }]);
  });

  it('tolerates losing the creation race, rethrows anything else', async () => {
    send
      .mockRejectedValueOnce(new S3ServiceException({ httpStatusCode: 404 }))
      .mockRejectedValueOnce(new S3ServiceException({ httpStatusCode: 409 }));
    await expect(service.onModuleInit()).resolves.toBeUndefined();

    send.mockRejectedValueOnce(new S3ServiceException({ httpStatusCode: 403 }));
    await expect(service.onModuleInit()).rejects.toThrow('http 403');
  });

  it('stores with the mime type and length', async () => {
    send.mockResolvedValueOnce({});
    await service.put('k1', Buffer.from('abc'), 'image/png');
    expect(commands()).toEqual([
      [
        'PutObject',
        {
          Bucket: 'media',
          Key: 'k1',
          Body: expect.any(Buffer) as Buffer,
          ContentLength: 3,
          ContentType: 'image/png',
        },
      ],
    ]);
  });

  it('reads whole objects and byte ranges, returning the body stream', async () => {
    const body = { pipe: jest.fn() };
    send.mockResolvedValue({ Body: body });
    await expect(service.get('k1')).resolves.toBe(body);
    await service.get('k1', { start: 100, end: 199 });
    expect(commands()).toEqual([
      ['GetObject', { Bucket: 'media', Key: 'k1', Range: undefined }],
      ['GetObject', { Bucket: 'media', Key: 'k1', Range: 'bytes=100-199' }],
    ]);
  });

  it('removes by key', async () => {
    send.mockResolvedValueOnce({});
    await service.remove('k1');
    expect(commands()).toEqual([
      ['DeleteObject', { Bucket: 'media', Key: 'k1' }],
    ]);
  });
});
