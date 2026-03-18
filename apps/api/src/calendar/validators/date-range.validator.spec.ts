import { IsStartBeforeEndConstraint } from './date-range.validator';
import { ValidationArguments } from 'class-validator';

function makeArgs(obj: Record<string, unknown>): ValidationArguments {
  return {
    object: obj,
    value: undefined,
    targetName: 'TestDto',
    property: 'startDate',
    constraints: [],
  };
}

describe('IsStartBeforeEndConstraint', () => {
  const validator = new IsStartBeforeEndConstraint();

  it('should pass when startDate is before endDate', () => {
    const args = makeArgs({
      startDate: '2026-01-15',
      endDate: '2026-01-16',
    });
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should pass when startDate equals endDate', () => {
    const args = makeArgs({
      startDate: '2026-01-15T10:00:00.000Z',
      endDate: '2026-01-15T10:00:00.000Z',
    });
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should fail when startDate is after endDate', () => {
    const args = makeArgs({
      startDate: '2026-01-20',
      endDate: '2026-01-10',
    });
    expect(validator.validate(undefined, args)).toBe(false);
  });

  it('should pass when startDate is missing', () => {
    const args = makeArgs({ endDate: '2026-01-16' });
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should pass when endDate is missing', () => {
    const args = makeArgs({ startDate: '2026-01-15' });
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should pass when both dates are missing', () => {
    const args = makeArgs({});
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should return a descriptive default message', () => {
    expect(validator.defaultMessage()).toContain('startDate');
    expect(validator.defaultMessage()).toContain('endDate');
  });
});
