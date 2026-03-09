import { IsIn, IsString, Matches, MaxLength } from 'class-validator';
import { IsValidTimezone } from '../validators/timezone.validator';

export class CreatePreferencesDto {
  @IsString()
  @MaxLength(35)
  @Matches(/^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/, {
    message: 'language must be a valid BCP 47 language tag (e.g. "en-US")',
  })
  language: string;

  @IsString()
  @MaxLength(50)
  @IsValidTimezone()
  timezone: string;

  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme: string;

  @IsString()
  @IsIn(['blue', 'indigo', 'violet', 'emerald', 'amber', 'slate'])
  accentColor: string;

  @IsString()
  @IsIn(['monday', 'sunday', 'saturday'])
  weekStart: string;
}
