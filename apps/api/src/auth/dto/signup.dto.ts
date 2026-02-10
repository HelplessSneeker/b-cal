import { IsEmail, IsString, MaxLength } from 'class-validator';
import { IsValidPassword } from '../validators/password.validator';

export class SignupDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MaxLength(128)
  @IsValidPassword()
  password: string;
}
