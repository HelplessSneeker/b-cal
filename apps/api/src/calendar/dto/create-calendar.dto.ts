import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { stripHtmlTags } from '../../common/utils/strip-html-tags';
import { IsStartBeforeEnd } from '../validators/date-range.validator';

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
}
