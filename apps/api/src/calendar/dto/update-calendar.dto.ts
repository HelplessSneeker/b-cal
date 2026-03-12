import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCalendarDto } from './create-calendar.dto';
import { EditScope } from '../enums/edit-scope.enum';

export class UpdateCalendarDto extends PartialType(CreateCalendarDto) {
  @IsOptional()
  @IsEnum(EditScope)
  scope?: EditScope;
}
