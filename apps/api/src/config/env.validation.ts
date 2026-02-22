import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsNumberString()
  PORT: string;

  @IsUrl(
    { require_tld: false },
    {
      message: 'FRONTEND_URL must be a valid URL (e.g. http://localhost:8080)',
    },
  )
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
  @MinLength(32, {
    message: 'SECRET_KEY must be at least 32 characters',
  })
  SECRET_KEY: string;

  @IsString()
  @MinLength(32, {
    message: 'REFRESH_SECRET_KEY must be at least 32 characters',
  })
  REFRESH_SECRET_KEY: string;

  @IsString()
  @MinLength(32, {
    message: 'MAIL_SECRET_KEY must be at least 32 characters',
  })
  MAIL_SECRET_KEY: string;

  @IsString()
  @MinLength(32, {
    message: 'CSRF_SECRET must be at least 32 characters',
  })
  CSRF_SECRET: string;

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

  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  @IsOptional()
  @IsNumberString()
  DB_POOL_MAX?: string;

  @IsOptional()
  @IsNumberString()
  DB_POOL_IDLE_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  DB_POOL_CONNECTION_TIMEOUT_MS?: string;
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
