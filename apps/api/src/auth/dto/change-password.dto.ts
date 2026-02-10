import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { IsValidPassword } from '../validators/password.validator';

export class ChangePasswordDTO {
  @IsString()
  @MaxLength(128)
  @IsValidPassword()
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token: string;
}
