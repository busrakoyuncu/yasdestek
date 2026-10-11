import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppExceptionFilter } from './app-exception.filter';

function mockHost() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { res, host };
}

describe('AppExceptionFilter', () => {
  const filter = new AppExceptionFilter();

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('derives the code from the http status', () => {
    const { res, host } = mockHost();
    filter.catch(new NotFoundException('User not found'), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  });

  it('keeps a custom code from the exception body', () => {
    const { res, host } = mockHost();
    filter.catch(
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'username is required',
      }),
      host,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 'VALIDATION_ERROR',
      message: 'username is required',
    });
  });

  it('hides unknown errors behind a 500', () => {
    const { res, host } = mockHost();
    filter.catch(new Error('db exploded'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
  });
});
