import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const validTimezones = new Set(Intl.supportedValuesOf('timeZone'));

@ValidatorConstraint({ async: false })
export class IsValidTimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return typeof value === 'string' && validTimezones.has(value);
  }

  defaultMessage(): string {
    return 'timezone must be a valid IANA timezone (e.g. "America/New_York")';
  }
}

export function IsValidTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTimezoneConstraint,
    });
  };
}
