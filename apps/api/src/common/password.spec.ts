import { generatePassword } from './password';

describe('generatePassword', () => {
  it('uses only unambiguous characters at the requested length', () => {
    const password = generatePassword();
    expect(password).toHaveLength(12);
    expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]+$/);
    expect(generatePassword(20)).toHaveLength(20);
  });

  it('is random', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});
