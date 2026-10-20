import { HttpException } from '@nestjs/common';
import { parseRange } from './range';

describe('parseRange', () => {
  it('serves the whole file without a usable header', () => {
    expect(parseRange(undefined, 100)).toBeUndefined();
    expect(parseRange('bytes=-50', 100)).toBeUndefined();
    expect(parseRange('items=0-1', 100)).toBeUndefined();
  });

  it('parses start-end and open-ended ranges, clamped to the file', () => {
    expect(parseRange('bytes=2-5', 100)).toEqual({ start: 2, end: 5 });
    expect(parseRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=0-500', 100)).toEqual({ start: 0, end: 99 });
  });

  it('rejects ranges that start past the end', () => {
    expect(() => parseRange('bytes=100-', 100)).toThrow(HttpException);
    expect(() => parseRange('bytes=5-2', 100)).toThrow(HttpException);
  });
});
