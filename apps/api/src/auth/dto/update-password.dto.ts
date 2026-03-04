import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { IsValidPassword } from '../validators/password.validator';

export class UpdatePasswordDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword: string;

  @IsString()
  @MaxLength(128)
  @IsValidPassword()
  newPassword: string;
}
