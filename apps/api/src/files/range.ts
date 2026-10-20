import { HttpException, HttpStatus } from '@nestjs/common';

export type ByteRange = { start: number; end: number };

// "bytes=start-end" or "bytes=start-" within a file of `size` bytes.
// Other forms are ignored (the whole file is served). A start past the end is 416.
export function parseRange(
  header: string | undefined,
  size: number,
): ByteRange | undefined {
  const match = /^bytes=(\d+)-(\d*)$/.exec(header ?? '');
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (start >= size || start > end) {
    throw new HttpException(
      { code: 'RANGE_NOT_SATISFIABLE', message: `Range outside 0-${size - 1}` },
      HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    );
  }
  return { start, end };
}
