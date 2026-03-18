import { IsValidPasswordConstraint } from './password.validator';

describe('IsValidPasswordConstraint', () => {
  const validator = new IsValidPasswordConstraint();

  it('should accept a valid password with number and symbol', () => {
    expect(validator.validate('MyPass1!')).toBe(true);
    expect(validator.validate('abcdefgh1@')).toBe(true);
    expect(validator.validate('Str0ng_P@ssword')).toBe(true);
  });

  it('should reject passwords shorter than 8 characters', () => {
    expect(validator.validate('Ab1!')).toBe(false);
    expect(validator.validate('Pa1!')).toBe(false);
    expect(validator.validate('1234567')).toBe(false);
  });

  it('should reject passwords without a number', () => {
    expect(validator.validate('Abcdefgh!')).toBe(false);
    expect(validator.validate('NoDigits@Here')).toBe(false);
  });

  it('should reject passwords without a symbol', () => {
    expect(validator.validate('Abcdefgh1')).toBe(false);
    expect(validator.validate('NoSymbol123')).toBe(false);
  });

  it('should reject empty and falsy values', () => {
    expect(validator.validate('')).toBe(false);
    expect(validator.validate(null as unknown as string)).toBe(false);
    expect(validator.validate(undefined as unknown as string)).toBe(false);
  });

  it('should accept various symbol characters', () => {
    const symbols = '!@#$%^&*()_+-=[]{};\':"|,.<>/?~`';
    for (const sym of symbols) {
      expect(validator.validate(`Abcdefg1${sym}`)).toBe(true);
    }
  });

  it('should return a descriptive default message', () => {
    const msg = validator.defaultMessage();
    expect(msg).toContain('8 characters');
    expect(msg).toContain('number');
    expect(msg).toContain('symbol');
  });
});
