import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
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

  @Transform(({ value }) => (typeof value === 'string' ? stripHtmlTags(value) : value))
  @IsString()
  @MaxLength(255)
  title: string;

  @Transform(({ value }) => (typeof value === 'string' ? stripHtmlTags(value) : value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  wholeDay?: boolean;
}
