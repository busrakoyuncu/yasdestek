import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema);

  it('returns the parsed value and drops unknown keys', () => {
    const input = { username: 'elif', password: 'longenough', extra: 1 };
    expect(pipe.transform(input)).toEqual({
      username: 'elif',
      password: 'longenough',
    });
  });

  it('throws VALIDATION_ERROR naming the first bad field', () => {
    expect(() => pipe.transform({ username: 'el', password: 'x' })).toThrow(
      BadRequestException,
    );
    try {
      pipe.transform({ username: 'el', password: 'x' });
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.stringMatching(/^username: /) as string,
      });
    }
  });
});
