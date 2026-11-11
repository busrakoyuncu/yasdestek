import { describe, expect, it } from 'vitest';
import de from './de.json';
import en from './en.json';
import tr from './tr.json';

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

// tr.json is the source of truth; a key added to one file must exist in all three.
describe('locales', () => {
  it('en and de mirror the keys of tr', () => {
    const expected = keys(tr).sort();
    expect(keys(en).sort()).toEqual(expected);
    expect(keys(de).sort()).toEqual(expected);
  });
});
