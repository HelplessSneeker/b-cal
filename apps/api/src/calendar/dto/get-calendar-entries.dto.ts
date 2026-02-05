import { IsDateString, IsOptional } from 'class-validator';
import { IsStartBeforeEnd } from '../validators/date-range.validator';

export class GetCalendarEntriesDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @IsStartBeforeEnd()
  endDate?: string;
}
