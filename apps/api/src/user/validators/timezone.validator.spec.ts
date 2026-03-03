import { IsValidTimezoneConstraint } from './timezone.validator';

describe('IsValidTimezoneConstraint', () => {
  const validator = new IsValidTimezoneConstraint();

  it('should accept valid IANA timezones', () => {
    expect(validator.validate('America/New_York')).toBe(true);
    expect(validator.validate('Europe/Berlin')).toBe(true);
    expect(validator.validate('Asia/Tokyo')).toBe(true);
    expect(validator.validate('Pacific/Auckland')).toBe(true);
  });

  it('should reject invalid timezones', () => {
    expect(validator.validate('Invalid/Timezone')).toBe(false);
    expect(validator.validate('')).toBe(false);
    expect(validator.validate('not-a-timezone')).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(validator.validate(123 as unknown as string)).toBe(false);
    expect(validator.validate(null as unknown as string)).toBe(false);
    expect(validator.validate(undefined as unknown as string)).toBe(false);
  });

  it('should return a descriptive default message', () => {
    expect(validator.defaultMessage()).toContain('valid IANA timezone');
  });
});
