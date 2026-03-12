import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsRecurrenceValidConstraint implements ValidatorConstraintInterface {
  private failMessage = '';

  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as {
      recurrenceFrequency?: string;
      recurrenceByDay?: string;
      recurrenceUntil?: string;
      startDate?: string;
    };

    if (obj.recurrenceByDay && obj.recurrenceFrequency !== 'WEEKLY') {
      this.failMessage = 'error.recurrenceByDayRequiresWeekly';
      return false;
    }

    if (obj.recurrenceUntil && obj.startDate) {
      if (new Date(obj.recurrenceUntil) < new Date(obj.startDate)) {
        this.failMessage = 'error.recurrenceUntilBeforeStart';
        return false;
      }
    }

    return true;
  }

  defaultMessage(): string {
    return this.failMessage;
  }
}

export function IsRecurrenceValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsRecurrenceValidConstraint,
    });
  };
}
