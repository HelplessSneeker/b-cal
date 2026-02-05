import { IsEmail, IsString } from 'class-validator';
import { IsValidPassword } from '../validators/password.validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsValidPassword()
  password: string;
}
