import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { defaultLocale } from '@b-cal/i18n/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from 'src/auth/auth.module';
import { CalendarModule } from 'src/calendar/calendar.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserModule } from 'src/user/user.module';
import { MailModule } from 'src/mail/mail.module';
import { MailService } from 'src/mail/mail.service';
import cookieParser from 'cookie-parser';

class TestMailService {
  lastVerificationTokenByEmail = new Map<string, string>();

  sendVerificationEmail(email: string, token: string) {
    this.lastVerificationTokenByEmail.set(email, token);
  }

  async sendPasswordResetEmail() {}
}

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'silent',
      },
    }),
    I18nModule.forRoot({
      fallbackLanguage: defaultLocale,
      loaderOptions: {
        path: path.join(
          path.dirname(require.resolve('@b-cal/i18n/locales/en/error.json')),
          '..',
        ),
      },
      resolvers: [AcceptLanguageResolver],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100000 }],
    }),
    CalendarModule,
    PrismaModule,
    AuthModule,
    UserModule,
    MailModule,
  ],
})
class TestAppModule {}

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

describe('UserController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testMailService: TestMailService;

  beforeAll(async () => {
    testMailService = new TestMailService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    })
      .overrideProvider(MailService)
      .useValue(testMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DELETE /user', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).delete('/user').expect(401);
    });

    it('should return 403 for unverified user', async () => {
      const unverifiedUser = {
        email: `user-delete-unverified-${Date.now()}@example.com`,
        password: 'testpassword123!',
      };

      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(unverifiedUser);
      const cookies = extractCookies(signupResponse);

      const response = await request(app.getHttpServer())
        .delete('/user')
        .set('Cookie', cookies)
        .expect(403);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Email not verified');

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: unverifiedUser.email },
      });
    }, 10000);

    it('should delete the user and their calendar entries', async () => {
      const testUser = {
        email: `user-delete-${Date.now()}@example.com`,
        password: 'testpassword123!',
      };

      // Signup and verify email
      await request(app.getHttpServer()).post('/auth/signup').send(testUser);

      const verificationToken =
        testMailService.lastVerificationTokenByEmail.get(testUser.email);
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: verificationToken });

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      const cookies = extractCookies(loginResponse);

      // Create calendar entries
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', cookies)
        .send({
          title: 'Entry 1',
          startDate: '2025-06-01T10:00:00.000Z',
          endDate: '2025-06-01T11:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', cookies)
        .send({
          title: 'Entry 2',
          startDate: '2025-06-02T10:00:00.000Z',
          endDate: '2025-06-02T11:00:00.000Z',
        })
        .expect(201);

      // Verify entries exist
      const entriesBefore = await prisma.calendarEntry.findMany({
        where: { userId: user!.id },
      });
      expect(entriesBefore.length).toBe(2);

      // Delete user
      const response = await request(app.getHttpServer())
        .delete('/user')
        .set('Cookie', cookies)
        .expect(200);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Successfully deleted user');

      // Verify user is gone
      const deletedUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(deletedUser).toBeNull();

      // Verify calendar entries are cascade deleted
      const entriesAfter = await prisma.calendarEntry.findMany({
        where: { userId: user!.id },
      });
      expect(entriesAfter.length).toBe(0);
    });

    it('should delete a user with no calendar entries', async () => {
      const testUser = {
        email: `user-delete-noentries-${Date.now()}@example.com`,
        password: 'testpassword123!',
      };

      // Signup and verify email
      await request(app.getHttpServer()).post('/auth/signup').send(testUser);

      const verificationToken =
        testMailService.lastVerificationTokenByEmail.get(testUser.email);
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: verificationToken });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser);
      const cookies = extractCookies(loginResponse);

      // Delete user with no entries
      const response = await request(app.getHttpServer())
        .delete('/user')
        .set('Cookie', cookies)
        .expect(200);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Successfully deleted user');

      // Verify user is gone
      const deletedUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(deletedUser).toBeNull();
    });

    it('should not affect other users when deleting', async () => {
      const userToDelete = {
        email: `user-delete-isolation-${Date.now()}@example.com`,
        password: 'testpassword123!',
      };
      const otherUser = {
        email: `user-delete-other-${Date.now()}@example.com`,
        password: 'testpassword123!',
      };

      // Create and verify both users
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(userToDelete);
      await request(app.getHttpServer()).post('/auth/signup').send(otherUser);

      const deleteVerificationToken =
        testMailService.lastVerificationTokenByEmail.get(userToDelete.email);
      const otherVerificationToken =
        testMailService.lastVerificationTokenByEmail.get(otherUser.email);

      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: deleteVerificationToken });
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: otherVerificationToken });

      const otherUserRecord = await prisma.user.findUnique({
        where: { email: otherUser.email },
      });

      // Login both
      const deleteLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(userToDelete);
      const deleteCookies = extractCookies(deleteLoginResponse);

      const otherLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(otherUser);
      const otherCookies = extractCookies(otherLoginResponse);

      // Create entries for both
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', deleteCookies)
        .send({
          title: 'Delete User Entry',
          startDate: '2025-07-01T10:00:00.000Z',
          endDate: '2025-07-01T11:00:00.000Z',
        });

      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', otherCookies)
        .send({
          title: 'Other User Entry',
          startDate: '2025-07-01T10:00:00.000Z',
          endDate: '2025-07-01T11:00:00.000Z',
        });

      // Delete first user
      await request(app.getHttpServer())
        .delete('/user')
        .set('Cookie', deleteCookies)
        .expect(200);

      // Other user and their entries should still exist
      const otherUserAfter = await prisma.user.findUnique({
        where: { email: otherUser.email },
      });
      expect(otherUserAfter).not.toBeNull();

      const otherEntries = await prisma.calendarEntry.findMany({
        where: { userId: otherUserRecord!.id },
      });
      expect(otherEntries.length).toBe(1);
      expect(otherEntries[0].title).toBe('Other User Entry');

      // Cleanup
      await prisma.calendarEntry.deleteMany({
        where: { userId: otherUserRecord!.id },
      });
      await prisma.user.deleteMany({
        where: { email: otherUser.email },
      });
    }, 15000);
  });
});
