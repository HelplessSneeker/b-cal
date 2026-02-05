import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsStartBeforeEndConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { startDate?: string; endDate?: string };

    if (!obj.startDate || !obj.endDate) {
      return true;
    }

    return new Date(obj.startDate) <= new Date(obj.endDate);
  }

  defaultMessage(): string {
    return 'startDate must be before or equal to endDate';
  }
}

export function IsStartBeforeEnd(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStartBeforeEndConstraint,
    });
  };
}
