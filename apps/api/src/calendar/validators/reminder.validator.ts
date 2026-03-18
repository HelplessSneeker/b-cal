import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsReminderValidConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as {
      reminderType?: string | null;
      reminderAmount?: number | null;
      reminderUnit?: string | null;
    };

    const fields = [obj.reminderType, obj.reminderAmount, obj.reminderUnit];
    const presentCount = fields.filter(
      (f) => f !== undefined && f !== null,
    ).length;

    // All three must be present together or all absent/null
    return presentCount === 0 || presentCount === 3;
  }

  defaultMessage(): string {
    return 'error.reminderFieldsIncomplete';
  }
}

export function IsReminderValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsReminderValidConstraint,
    });
  };
}
