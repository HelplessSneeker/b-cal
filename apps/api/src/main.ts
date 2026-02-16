import './instrument';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import {
  doubleCsrfProtection,
  invalidCsrfTokenError,
} from './csrf/csrf.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  const isProduction = process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", ...(!isProduction ? ["'unsafe-inline'"] : [])],
          styleSrc: ["'self'", ...(!isProduction ? ["'unsafe-inline'"] : [])],
          imgSrc: ["'self'", ...(!isProduction ? ['data:'] : [])],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Calendar API')
      .setDescription(
        'A simple API for authentication and Calendar Functionality',
      )
      .setVersion('0.1')
      .addTag('b-cal')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);
  }

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  app.enableShutdownHooks();

  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    doubleCsrfProtection(req, res, (err?: unknown) => {
      if (err === invalidCsrfTokenError) {
        res.status(403).json({ message: 'Invalid CSRF token' });
        return;
      }
      next(err as Error);
    });
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
