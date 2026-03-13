import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { stripHtmlTags } from '../../common/utils/strip-html-tags';
import { CalendarColor } from '../enums/calendar-color.enum';

export class CreateCalendarDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? stripHtmlTags(value).trim() : (value as string),
  )
  @IsString()
  @IsNotEmpty({ message: 'name should not be empty' })
  @MaxLength(50)
  name: string;

  @IsEnum(CalendarColor)
  color: CalendarColor;
}
