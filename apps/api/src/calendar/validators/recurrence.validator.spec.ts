import { IsRecurrenceValidConstraint } from './recurrence.validator';
import { ValidationArguments } from 'class-validator';

function makeArgs(obj: Record<string, unknown>): ValidationArguments {
  return {
    object: obj,
    value: undefined,
    targetName: 'TestDto',
    property: 'recurrenceFrequency',
    constraints: [],
  };
}

describe('IsRecurrenceValidConstraint', () => {
  let validator: IsRecurrenceValidConstraint;

  beforeEach(() => {
    // Create a fresh instance each time to avoid shared failMessage state
    validator = new IsRecurrenceValidConstraint();
  });

  it('should pass with no recurrence fields', () => {
    const args = makeArgs({});
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should pass with byDay and WEEKLY frequency', () => {
    const args = makeArgs({
      recurrenceFrequency: 'WEEKLY',
      recurrenceByDay: 'MO,WE,FR',
      startDate: '2026-01-01',
    });
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should fail with byDay and non-WEEKLY frequency', () => {
    const args = makeArgs({
      recurrenceFrequency: 'DAILY',
      recurrenceByDay: 'MO,WE,FR',
    });
    expect(validator.validate(undefined, args)).toBe(false);
    expect(validator.defaultMessage()).toBe(
      'error.recurrenceByDayRequiresWeekly',
    );
  });

  it('should fail with byDay and MONTHLY frequency', () => {
    const args = makeArgs({
      recurrenceFrequency: 'MONTHLY',
      recurrenceByDay: 'TU',
    });
    expect(validator.validate(undefined, args)).toBe(false);
    expect(validator.defaultMessage()).toBe(
      'error.recurrenceByDayRequiresWeekly',
    );
  });

  it('should fail with byDay and no frequency', () => {
    const args = makeArgs({
      recurrenceByDay: 'MO',
    });
    expect(validator.validate(undefined, args)).toBe(false);
    expect(validator.defaultMessage()).toBe(
      'error.recurrenceByDayRequiresWeekly',
    );
  });

  it('should pass when recurrenceUntil is after startDate', () => {
    const args = makeArgs({
      recurrenceFrequency: 'DAILY',
      startDate: '2026-01-01',
      recurrenceUntil: '2026-01-31',
    });
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should pass when recurrenceUntil equals startDate', () => {
    const args = makeArgs({
      recurrenceFrequency: 'DAILY',
      startDate: '2026-03-15T09:00:00.000Z',
      recurrenceUntil: '2026-03-15T09:00:00.000Z',
    });
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should fail when recurrenceUntil is before startDate', () => {
    const args = makeArgs({
      recurrenceFrequency: 'DAILY',
      startDate: '2026-03-15',
      recurrenceUntil: '2026-03-01',
    });
    expect(validator.validate(undefined, args)).toBe(false);
    expect(validator.defaultMessage()).toBe('error.recurrenceUntilBeforeStart');
  });

  it('should pass when recurrenceUntil is set but startDate is missing', () => {
    const args = makeArgs({
      recurrenceUntil: '2026-03-01',
    });
    expect(validator.validate(undefined, args)).toBe(true);
  });

  it('should produce correct error for each failure reason independently', () => {
    // First: byDay failure
    const v1 = new IsRecurrenceValidConstraint();
    v1.validate(undefined, makeArgs({ recurrenceByDay: 'MO' }));
    expect(v1.defaultMessage()).toBe('error.recurrenceByDayRequiresWeekly');

    // Second: until failure
    const v2 = new IsRecurrenceValidConstraint();
    v2.validate(
      undefined,
      makeArgs({
        startDate: '2026-03-15',
        recurrenceUntil: '2026-03-01',
      }),
    );
    expect(v2.defaultMessage()).toBe('error.recurrenceUntilBeforeStart');
  });
});
