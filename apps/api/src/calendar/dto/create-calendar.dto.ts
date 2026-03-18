import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { stripHtmlTags } from '../../common/utils/strip-html-tags';
import { IsStartBeforeEnd } from '../validators/date-range.validator';
import { IsRecurrenceValid } from '../validators/recurrence.validator';
import { IsReminderValid } from '../validators/reminder.validator';
import { RecurrenceFrequency } from '../enums/recurrence-frequency.enum';
import { ReminderType } from '../enums/reminder-type.enum';
import { ReminderUnit } from '../enums/reminder-unit.enum';

export class CreateCalendarDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsStartBeforeEnd()
  endDate: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? stripHtmlTags(value).trim() : (value as string),
  )
  @IsString()
  @IsNotEmpty({ message: 'title should not be empty' })
  @MaxLength(100)
  title: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? stripHtmlTags(value) : (value as string),
  )
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  wholeDay?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  calendarId?: string | null;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrenceFrequency?: RecurrenceFrequency;

  @IsOptional()
  @IsString()
  @Matches(/^(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*$/)
  @IsRecurrenceValid()
  recurrenceByDay?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) =>
    typeof value === 'string' && value.length === 10
      ? `${value}T23:59:59.999Z`
      : (value as string),
  )
  recurrenceUntil?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(ReminderType)
  @IsReminderValid()
  reminderType?: ReminderType | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(10080)
  reminderAmount?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(ReminderUnit)
  reminderUnit?: ReminderUnit | null;
}
