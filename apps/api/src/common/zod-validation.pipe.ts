import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';

// Validates one argument (body, query, or param) against a zod schema and
// replaces it with the parsed value. Usage:
//   @Body(new ZodValidationPipe(loginSchema)) body: LoginInput
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const issue = result.error.issues[0];
    const path = issue.path.join('.');
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: path ? `${path}: ${issue.message}` : issue.message,
    });
  }
}
