import { IsDateString, IsOptional, IsString } from 'class-validator';
import { IsStartBeforeEnd } from '../validators/date-range.validator';

export class CreateCalendarDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsStartBeforeEnd()
  endDate: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content: string;
}
