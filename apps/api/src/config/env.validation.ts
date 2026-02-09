import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateIf,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsNumberString()
  PORT: string;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL: string;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsNumberString()
  DB_PORT: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsString()
  @IsNotEmpty()
  SECRET_KEY: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_SECRET_KEY: string;

  @IsString()
  @IsNotEmpty()
  MAIL_SECRET_KEY: string;

  @ValidateIf((o: { NODE_ENV?: string }) => o.NODE_ENV === 'production')
  @IsString()
  @IsNotEmpty()
  MAIL_HOST: string;

  @ValidateIf((o: { NODE_ENV?: string }) => o.NODE_ENV === 'production')
  @IsNumberString()
  MAIL_PORT: string;

  @ValidateIf((o: { NODE_ENV?: string }) => o.NODE_ENV === 'production')
  @IsString()
  @IsNotEmpty()
  MAIL_USER: string;

  @ValidateIf((o: { NODE_ENV?: string }) => o.NODE_ENV === 'production')
  @IsString()
  @IsNotEmpty()
  MAIL_PASS: string;

  @IsOptional()
  @IsString()
  MAIL_FROM?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => `  - ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n')}`,
    );
  }

  return validatedConfig;
}
