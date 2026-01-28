import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenResponse } from 'src/auth/types';

interface ErrorResponse {
  message: string | string[];
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
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user and return tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);

      const body = response.body as TokenResponse;
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(typeof body.access_token).toBe('string');
      expect(typeof body.refresh_token).toBe('string');
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
    it('should login and return tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
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
    let refreshToken: string;

    beforeAll(async () => {
      // Login to get a refresh token
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      const body = response.body as TokenResponse;
      refreshToken = body.refresh_token;
    });

    it('should return new tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Login to get an access token
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      const body = response.body as TokenResponse;
      accessToken = body.access_token;
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should return 401 with invalid access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should logout successfully with valid access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });

    it('should invalidate refresh token after logout', async () => {
      // Login again to get new tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);

      const loginBody = loginResponse.body as TokenResponse;
      const newAccessToken = loginBody.access_token;
      const newRefreshToken = loginBody.refresh_token;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(201);

      // Try to refresh with the old refresh token - should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${newRefreshToken}`)
        .expect(403);
    });
  });
});
