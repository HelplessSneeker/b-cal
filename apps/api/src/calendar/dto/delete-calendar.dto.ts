import { IsEnum, IsOptional } from 'class-validator';
import { EditScope } from '../enums/edit-scope.enum';

export class DeleteCalendarDto {
  @IsOptional()
  @IsEnum(EditScope)
  scope?: EditScope;
}
