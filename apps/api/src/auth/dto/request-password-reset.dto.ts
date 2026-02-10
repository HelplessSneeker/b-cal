import { IsEmail, MaxLength } from 'class-validator';

export class RequestPasswordResetDTO {
  @IsEmail()
  @MaxLength(254)
  email: string;
}
