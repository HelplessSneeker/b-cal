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

interface UserResponse {
  data: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
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
    password: 'testpassword123!',
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

      // Verify the email so subsequent login tests can work
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: user!.verificationToken })
        .expect(200);
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
        .send({ email: 'invalid-email', password: 'testpassword123!' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain('email must be an email');
    });

    it('should return 400 for password shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'valid@email.com', password: 'short1!' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'Password must be at least 8 characters and contain at least one number and one symbol',
      );
    });

    it('should return 400 for password without a number', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'valid@email.com', password: 'testpassword!' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'Password must be at least 8 characters and contain at least one number and one symbol',
      );
    });

    it('should return 400 for password without a symbol', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'valid@email.com', password: 'testpassword123' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'Password must be at least 8 characters and contain at least one number and one symbol',
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

    it('should allow login when email is not verified', async () => {
      const unverifiedUser = {
        email: `unverified-login-${Date.now()}@example.com`,
        password: 'testpassword123!',
      };

      // Create unverified user
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(unverifiedUser)
        .expect(201);

      // Confirm the user is not verified in DB
      const dbUser = await prisma.user.findUnique({
        where: { email: unverifiedUser.email },
      });
      expect(dbUser!.emailVerified).toBe(false);

      // Login should succeed so user can resend verification
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(unverifiedUser)
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Login successful');

      const cookies = extractCookies(response);
      expect(getCookieValue(cookies, 'access_token')).toBeDefined();
      expect(getCookieValue(cookies, 'refresh_token')).toBeDefined();

      // Cleanup
      await prisma.user.delete({ where: { email: unverifiedUser.email } });
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

      const { data } = response.body as UserResponse;
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email', testUser.email);
      expect(data).toHaveProperty('emailVerified', true);
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

  describe('GET /auth/verify-email', () => {
    const verifyEmailUser = {
      email: `verify-email-${Date.now()}@example.com`,
      password: 'testpassword123!',
    };

    beforeAll(async () => {
      // Create a fresh user for email verification tests
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(verifyEmailUser);
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { email: verifyEmailUser.email },
      });
    });

    it('should verify email with valid token', async () => {
      // Get the verification token from the database
      const user = await prisma.user.findUnique({
        where: { email: verifyEmailUser.email },
      });
      expect(user).toBeDefined();
      expect(user!.verificationToken).toBeDefined();
      expect(user!.emailVerified).toBe(false);

      const response = await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: user!.verificationToken })
        .expect(200);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Email verified');

      // Verify the user is now marked as verified
      const updatedUser = await prisma.user.findUnique({
        where: { email: verifyEmailUser.email },
      });
      expect(updatedUser!.emailVerified).toBe(true);
      expect(updatedUser!.verificationToken).toBeNull();
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: 'invalid-token' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Invalid or expired token');
    });

    it('should return 400 for empty token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: '' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain('token should not be empty');
    });

    it('should return 400 for missing token', async () => {
      await request(app.getHttpServer()).get('/auth/verify-email').expect(400);
    });

    it('should return 400 when token is already used', async () => {
      // Create another user
      const anotherUser = {
        email: `verify-used-${Date.now()}@example.com`,
        password: 'testpassword123!',
      };
      await request(app.getHttpServer()).post('/auth/signup').send(anotherUser);

      const user = await prisma.user.findUnique({
        where: { email: anotherUser.email },
      });
      const verificationToken = user!.verificationToken;

      // First verification should succeed
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: verificationToken })
        .expect(200);

      // Second verification with same token should fail (token is now null in DB)
      const response = await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: verificationToken })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Invalid or expired token');

      // Cleanup
      await prisma.user.delete({ where: { email: anotherUser.email } });
    });
  });

  describe('POST /auth/resend-verification', () => {
    const unverifiedUser = {
      email: `resend-verify-${Date.now()}@example.com`,
      password: 'testpassword123!',
    };

    let unverifiedCookies: string[];

    beforeAll(async () => {
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(unverifiedUser);
      unverifiedCookies = extractCookies(signupResponse);
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { email: unverifiedUser.email },
      });
    });

    it('should resend verification email for unverified user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .set('Cookie', unverifiedCookies)
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Verification email sent');

      // Verify a new verification token was set
      const user = await prisma.user.findUnique({
        where: { email: unverifiedUser.email },
      });
      expect(user!.verificationToken).toBeDefined();
      expect(user!.verificationToken).not.toBeNull();
    });

    it('should return 400 when email is already verified', async () => {
      // Verify the email first
      const user = await prisma.user.findUnique({
        where: { email: unverifiedUser.email },
      });
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: user!.verificationToken })
        .expect(200);

      // Now try to resend — need fresh cookies with emailVerified: true
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(unverifiedUser);
      const verifiedCookies = extractCookies(loginResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .set('Cookie', verifiedCookies)
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Email already verified');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should return success message for existing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('If that email exists, we sent a reset link');

      // Verify reset token was set in database
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user!.resetToken).toBeDefined();
      expect(user!.resetToken).not.toBeNull();
    });

    it('should return success message for non-existent email (security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('If that email exists, we sent a reset link');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain('email must be an email');
    });

    it('should return 400 for missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    const resetPasswordUser = {
      email: `reset-pw-${Date.now()}@example.com`,
      password: 'oldpassword123!',
    };

    beforeAll(async () => {
      // Create a fresh user for password reset tests
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(resetPasswordUser);

      // Verify the email so the user can login after password reset
      const user = await prisma.user.findUnique({
        where: { email: resetPasswordUser.email },
      });
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: user!.verificationToken });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { email: resetPasswordUser.email },
      });
    });

    it('should reset password with valid token', async () => {
      // Request password reset
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: resetPasswordUser.email });

      // Get the reset token from database
      const user = await prisma.user.findUnique({
        where: { email: resetPasswordUser.email },
      });
      expect(user!.resetToken).toBeDefined();

      const newPassword = 'newpassword123!';

      // Reset password
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: user!.resetToken,
          password: newPassword,
        })
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Password changed successfully');

      // Verify reset token is cleared
      const updatedUser = await prisma.user.findUnique({
        where: { email: resetPasswordUser.email },
      });
      expect(updatedUser!.resetToken).toBeNull();

      // Verify can login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: resetPasswordUser.email, password: newPassword })
        .expect(201);

      const loginBody = loginResponse.body as MessageResponse;
      expect(loginBody.message).toBe('Login successful');
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123!',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Invalid or expired token');
    });

    it('should return 400 for empty token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: '',
          password: 'newpassword123!',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain('token should not be empty');
    });

    it('should return 400 for weak password', async () => {
      // Request password reset first
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: resetPasswordUser.email });

      const user = await prisma.user.findUnique({
        where: { email: resetPasswordUser.email },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: user!.resetToken,
          password: 'weak',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'Password must be at least 8 characters and contain at least one number and one symbol',
      );
    });

    it('should return 400 for password without symbol', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: resetPasswordUser.email });

      const user = await prisma.user.findUnique({
        where: { email: resetPasswordUser.email },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: user!.resetToken,
          password: 'password123',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'Password must be at least 8 characters and contain at least one number and one symbol',
      );
    });

    it('should return 400 when token is already used', async () => {
      // Create another user for this test
      const anotherUser = {
        email: `reset-used-${Date.now()}@example.com`,
        password: 'oldpassword123!',
      };
      await request(app.getHttpServer()).post('/auth/signup').send(anotherUser);

      // Get user and verify email first (not strictly needed for reset, but good practice)
      const createdUser = await prisma.user.findUnique({
        where: { email: anotherUser.email },
      });
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: createdUser!.verificationToken });

      // Request password reset
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: anotherUser.email });

      const user = await prisma.user.findUnique({
        where: { email: anotherUser.email },
      });

      // First reset should succeed
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: user!.resetToken,
          password: 'newpassword123!',
        })
        .expect(201);

      // Second reset with same token should fail
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: user!.resetToken,
          password: 'anotherpassword123!',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Invalid or expired token');

      // Cleanup
      await prisma.user.delete({ where: { email: anotherUser.email } });
    }, 15000);

    it('should return 400 for missing password', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: resetPasswordUser.email });

      const user = await prisma.user.findUnique({
        where: { email: resetPasswordUser.email },
      });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: user!.resetToken,
        })
        .expect(400);
    });
  });
});
