import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import cookieParser from 'cookie-parser';

interface ErrorResponse {
  message: string | string[];
}

interface MessageResponse {
  message: string;
}

function extractCookies(response: request.Response): string[] {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return [];
  return Array.isArray(cookies) ? cookies : [cookies];
}

function getCookieValue(cookies: string[], name: string): string | undefined {
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));
  if (!cookie) return undefined;
  return cookie.split(';')[0].split('=')[1];
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testUser = {
    email: `e2e-test-${Date.now()}@example.com`,
    password: 'testpassword123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user and set token cookies', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Signup successful');

      const cookies = extractCookies(response);
      expect(getCookieValue(cookies, 'access_token')).toBeDefined();
      expect(getCookieValue(cookies, 'refresh_token')).toBeDefined();
    });

    it('should return 409 when email already exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(409);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Email already registered');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'invalid-email', password: 'testpassword123' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain('email must be an email');
    });

    it('should return 400 for password shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'valid@email.com', password: 'short' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'password must be longer than or equal to 8 characters',
      );
    });
  });

  describe('POST /auth/login', () => {
    it('should login and set token cookies', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Login successful');

      const cookies = extractCookies(response);
      expect(getCookieValue(cookies, 'access_token')).toBeDefined();
      expect(getCookieValue(cookies, 'refresh_token')).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'anypassword' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let cookies: string[];

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      cookies = extractCookies(response);
    });

    it('should return new tokens with valid refresh token cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Tokens refreshed');

      const newCookies = extractCookies(response);
      expect(getCookieValue(newCookies, 'access_token')).toBeDefined();
      expect(getCookieValue(newCookies, 'refresh_token')).toBeDefined();
    });

    it('should return 401 without cookies', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('should return 401 with invalid refresh token cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=invalid-token'])
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let cookies: string[];

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      cookies = extractCookies(response);
    });

    it('should return 401 without cookies', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should return 401 with invalid access token cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', ['access_token=invalid-token'])
        .expect(401);
    });

    it('should logout successfully with valid access token cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Logout successful');
    });

    it('should invalidate refresh token after logout', async () => {
      // Login again to get new tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      const newCookies = extractCookies(loginResponse);

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', newCookies)
        .expect(201);

      // Try to refresh with the old refresh token - should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', newCookies)
        .expect(403);
    });
  });

  describe('GET /auth/me', () => {
    let cookies: string[];

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      cookies = extractCookies(response);
    });

    it('should return user info with valid access token cookie', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', testUser.email);
    });

    it('should return 401 without cookies', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return 401 with invalid access token cookie', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', ['access_token=invalid-token'])
        .expect(401);
    });
  });
});
