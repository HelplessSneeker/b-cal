import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsStartBeforeEnd } from '../validators/date-range.validator';

export class CreateCalendarDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsStartBeforeEnd()
  endDate: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  wholeDay?: boolean;
}
