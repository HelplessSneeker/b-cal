import { IsString, IsNotEmpty } from 'class-validator';
import { IsValidPassword } from '../validators/password.validator';

export class ChangePasswordDTO {
  @IsString()
  @IsValidPassword()
  password: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}
