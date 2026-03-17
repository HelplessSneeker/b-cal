import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
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
    CacheModule.register({ isGlobal: true }),
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

interface CalendarEntry {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  content: string | null;
  wholeDay: boolean | null;
  userId: string;
  isRecurring?: boolean;
  recurrenceFrequency?: string | null;
  recurrenceByDay?: string | null;
  recurrenceUntil?: string | null;
  originalDate?: string | null;
}

interface DataResponse<T> {
  data: T;
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

async function findEntryByTitle(
  prismaService: PrismaService,
  title: string,
  userEmail: string,
): Promise<string> {
  const entry = await prismaService.calendarEntry.findFirst({
    where: { title, user: { email: userEmail } },
    orderBy: { startDate: 'desc' },
  });
  return entry!.id;
}

describe('CalendarController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testMailService: TestMailService;

  const testUser = {
    email: `calendar-e2e-${Date.now()}@example.com`,
    password: 'testpassword123!',
  };

  const otherUser = {
    email: `calendar-e2e-other-${Date.now()}@example.com`,
    password: 'testpassword123!',
  };

  let userCookies: string[];
  let otherUserCookies: string[];
  let userId: string;

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

    // Create test user and get cookies
    await request(app.getHttpServer()).post('/auth/signup').send(testUser);

    // Verify the test user's email
    const testVerificationToken =
      testMailService.lastVerificationTokenByEmail.get(testUser.email);
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: testVerificationToken });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(testUser);
    userCookies = extractCookies(loginResponse);

    // Get user ID
    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', userCookies);
    userId = (meResponse.body as UserResponse).data.id;

    // Create another user for isolation tests
    await request(app.getHttpServer()).post('/auth/signup').send(otherUser);

    // Verify the other user's email
    const otherVerificationToken =
      testMailService.lastVerificationTokenByEmail.get(otherUser.email);
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: otherVerificationToken });

    const otherLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(otherUser);
    otherUserCookies = extractCookies(otherLoginResponse);
  }, 30000);

  afterAll(async () => {
    // Clean up recurrence exceptions first
    await prisma.recurrenceException.deleteMany({
      where: {
        calendarEntry: {
          user: {
            email: { in: [testUser.email, otherUser.email] },
          },
        },
      },
    });
    // Clean up calendar entries (foreign key constraint)
    await prisma.calendarEntry.deleteMany({
      where: {
        user: {
          email: { in: [testUser.email, otherUser.email] },
        },
      },
    });
    // Then clean up users
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, otherUser.email] } },
    });
    await app.close();
  });

  describe('Email verification guard', () => {
    const unverifiedUser = {
      email: `calendar-unverified-${Date.now()}@example.com`,
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

    it('should return 403 for unverified user on POST /calendar', async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', unverifiedCookies)
        .send({
          title: 'Test',
          startDate: '2025-01-15T10:00:00.000Z',
          endDate: '2025-01-15T11:00:00.000Z',
        })
        .expect(403);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Email not verified');
    });

    it('should return 403 for unverified user on GET /calendar', async () => {
      const response = await request(app.getHttpServer())
        .get('/calendar')
        .set('Cookie', unverifiedCookies)
        .expect(403);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Email not verified');
    });
  });

  describe('POST /calendar', () => {
    const validEntry = {
      title: 'Test Meeting',
      startDate: '2025-01-15T10:00:00.000Z',
      endDate: '2025-01-15T11:00:00.000Z',
      content: 'Discussion about project',
    };

    it('should create a calendar entry with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send(validEntry)
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Calendar entry created');
    });

    it('should create a calendar entry without optional content', async () => {
      const entryWithoutContent = {
        title: 'Quick Sync',
        startDate: '2025-01-16T14:00:00.000Z',
        endDate: '2025-01-16T14:30:00.000Z',
      };

      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send(entryWithoutContent)
        .expect(201);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Calendar entry created');
    });

    it('should create a calendar entry with wholeDay set to true', async () => {
      const wholeDayEntry = {
        title: 'All Day Event',
        startDate: '2025-01-17T00:00:00.000Z',
        endDate: '2025-01-17T23:59:59.000Z',
        wholeDay: true,
      };

      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send(wholeDayEntry)
        .expect(201);

      const entryId = await findEntryByTitle(
        prisma,
        'All Day Event',
        testUser.email,
      );

      const getResponse = await request(app.getHttpServer())
        .get(`/calendar/${entryId}`)
        .set('Cookie', userCookies);
      const getBody = getResponse.body as DataResponse<CalendarEntry>;
      expect(getBody.data.wholeDay).toBe(true);
    });

    it('should return 400 when wholeDay is not a boolean', async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Invalid Entry',
          startDate: '2025-01-18T10:00:00.000Z',
          endDate: '2025-01-18T11:00:00.000Z',
          wholeDay: 'yes',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain('wholeDay must be a boolean value');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/calendar')
        .send(validEntry)
        .expect(401);
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          startDate: '2025-01-15T10:00:00.000Z',
          endDate: '2025-01-15T11:00:00.000Z',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain('title must be a string');
    });

    it('should return 400 when startDate is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Test',
          endDate: '2025-01-15T11:00:00.000Z',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'startDate must be a valid ISO 8601 date string',
      );
    });

    it('should return 400 when endDate is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Test',
          startDate: '2025-01-15T10:00:00.000Z',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'endDate must be a valid ISO 8601 date string',
      );
    });

    it('should return 400 when startDate is after endDate', async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Invalid Meeting',
          startDate: '2025-01-15T12:00:00.000Z',
          endDate: '2025-01-15T10:00:00.000Z',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'startDate must be before or equal to endDate',
      );
    });

    it('should strip HTML tags from title and content on create', async () => {
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: '<b>HTML</b> Title',
          startDate: '2025-06-01T10:00:00.000Z',
          endDate: '2025-06-01T11:00:00.000Z',
          content: '<script>alert("xss")</script>Safe content',
        })
        .expect(201);

      const entryId = await findEntryByTitle(
        prisma,
        'HTML Title',
        testUser.email,
      );
      const getResponse = await request(app.getHttpServer())
        .get(`/calendar/${entryId}`)
        .set('Cookie', userCookies);
      const getBody = getResponse.body as DataResponse<CalendarEntry>;
      expect(getBody.data.title).toBe('HTML Title');
      expect(getBody.data.content).toBe('alert("xss")Safe content');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Test',
          startDate: 'not-a-date',
          endDate: '2025-01-15T11:00:00.000Z',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'startDate must be a valid ISO 8601 date string',
      );
    });
  });

  describe('GET /calendar', () => {
    beforeAll(async () => {
      // Create entries for testing
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'January Meeting',
          startDate: '2025-01-20T09:00:00.000Z',
          endDate: '2025-01-20T10:00:00.000Z',
        });

      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'February Meeting',
          startDate: '2025-02-15T09:00:00.000Z',
          endDate: '2025-02-15T10:00:00.000Z',
        });
    });

    it('should return all calendar entries for the user', async () => {
      const response = await request(app.getHttpServer())
        .get('/calendar')
        .set('Cookie', userCookies)
        .expect(200);

      const body = response.body as DataResponse<CalendarEntry[]>;
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      body.data.forEach((entry) => {
        expect(entry.userId).toBe(userId);
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/calendar').expect(401);
    });

    it('should filter entries by startDate', async () => {
      const response = await request(app.getHttpServer())
        .get('/calendar')
        .query({ startDate: '2025-02-01T00:00:00.000Z' })
        .set('Cookie', userCookies)
        .expect(200);

      const body = response.body as DataResponse<CalendarEntry[]>;
      body.data.forEach((entry) => {
        expect(new Date(entry.endDate).getTime()).toBeGreaterThanOrEqual(
          new Date('2025-02-01T00:00:00.000Z').getTime(),
        );
      });
    });

    it('should filter entries by endDate', async () => {
      const response = await request(app.getHttpServer())
        .get('/calendar')
        .query({ endDate: '2025-01-31T23:59:59.000Z' })
        .set('Cookie', userCookies)
        .expect(200);

      const body = response.body as DataResponse<CalendarEntry[]>;
      body.data.forEach((entry) => {
        expect(new Date(entry.startDate).getTime()).toBeLessThanOrEqual(
          new Date('2025-01-31T23:59:59.000Z').getTime(),
        );
      });
    });

    it('should filter entries by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/calendar')
        .query({
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: '2025-01-31T23:59:59.000Z',
        })
        .set('Cookie', userCookies)
        .expect(200);

      const body = response.body as DataResponse<CalendarEntry[]>;
      expect(body.data.some((e) => e.title === 'January Meeting')).toBe(true);
      expect(body.data.some((e) => e.title === 'February Meeting')).toBe(false);
    });

    it('should return empty array when no entries match date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/calendar')
        .query({
          startDate: '2030-01-01T00:00:00.000Z',
          endDate: '2030-12-31T23:59:59.000Z',
        })
        .set('Cookie', userCookies)
        .expect(200);

      const body = response.body as DataResponse<CalendarEntry[]>;
      expect(body.data).toEqual([]);
    });

    it('should return 400 for invalid startDate format', async () => {
      const response = await request(app.getHttpServer())
        .get('/calendar')
        .query({ startDate: 'invalid' })
        .set('Cookie', userCookies)
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toContain(
        'startDate must be a valid ISO 8601 date string',
      );
    });

    it('should not return entries from other users', async () => {
      // Create an entry as other user
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', otherUserCookies)
        .send({
          title: 'Other User Meeting',
          startDate: '2025-01-25T09:00:00.000Z',
          endDate: '2025-01-25T10:00:00.000Z',
        });

      // Fetch as main user
      const response = await request(app.getHttpServer())
        .get('/calendar')
        .set('Cookie', userCookies)
        .expect(200);

      const body = response.body as DataResponse<CalendarEntry[]>;
      expect(body.data.some((e) => e.title === 'Other User Meeting')).toBe(
        false,
      );
    });
  });

  describe('GET /calendar/:id', () => {
    let testEntryId: string;

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Specific Entry',
          startDate: '2025-03-10T14:00:00.000Z',
          endDate: '2025-03-10T15:00:00.000Z',
          content: 'Entry for testing findOne',
        });
      testEntryId = await findEntryByTitle(
        prisma,
        'Specific Entry',
        testUser.email,
      );
    });

    it('should return a specific calendar entry', async () => {
      const response = await request(app.getHttpServer())
        .get(`/calendar/${testEntryId}`)
        .set('Cookie', userCookies)
        .expect(200);

      const body = response.body as DataResponse<CalendarEntry>;
      expect(body.data.id).toBe(testEntryId);
      expect(body.data.title).toBe('Specific Entry');
      expect(body.data.content).toBe('Entry for testing findOne');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/calendar/${testEntryId}`)
        .expect(401);
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/calendar/${fakeId}`)
        .set('Cookie', userCookies)
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Calendar entry not found');
    });

    it("should return 404 when accessing another user's entry", async () => {
      // Create entry as other user
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', otherUserCookies)
        .send({
          title: 'Private Entry',
          startDate: '2025-03-15T09:00:00.000Z',
          endDate: '2025-03-15T10:00:00.000Z',
        });
      const otherEntryId = await findEntryByTitle(
        prisma,
        'Private Entry',
        otherUser.email,
      );

      // Try to access as main user
      const response = await request(app.getHttpServer())
        .get(`/calendar/${otherEntryId}`)
        .set('Cookie', userCookies)
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Calendar entry not found');
    });
  });

  describe('PATCH /calendar/:id', () => {
    let updateEntryId: string;

    beforeEach(async () => {
      await prisma.calendarEntry.deleteMany({
        where: { title: 'Entry to Update', user: { email: testUser.email } },
      });

      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Entry to Update',
          startDate: '2025-04-10T10:00:00.000Z',
          endDate: '2025-04-10T11:00:00.000Z',
          content: 'Original content',
        });
      updateEntryId = await findEntryByTitle(
        prisma,
        'Entry to Update',
        testUser.email,
      );
    });

    it('should update a calendar entry title', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies)
        .send({ title: 'Updated Title' })
        .expect(200);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Calendar entry has been updated');

      // Verify the update
      const getResponse = await request(app.getHttpServer())
        .get(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies);
      const getBody = getResponse.body as DataResponse<CalendarEntry>;
      expect(getBody.data.title).toBe('Updated Title');
    });

    it('should update a calendar entry dates', async () => {
      await request(app.getHttpServer())
        .patch(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies)
        .send({
          startDate: '2025-04-11T09:00:00.000Z',
          endDate: '2025-04-11T12:00:00.000Z',
        })
        .expect(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies);
      const getBody = getResponse.body as DataResponse<CalendarEntry>;
      expect(getBody.data.startDate).toBe('2025-04-11T09:00:00.000Z');
      expect(getBody.data.endDate).toBe('2025-04-11T12:00:00.000Z');
    });

    it('should update a calendar entry content', async () => {
      await request(app.getHttpServer())
        .patch(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies)
        .send({ content: 'New content' })
        .expect(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies);
      const getBody = getResponse.body as DataResponse<CalendarEntry>;
      expect(getBody.data.content).toBe('New content');
    });

    it('should update a calendar entry wholeDay', async () => {
      await request(app.getHttpServer())
        .patch(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies)
        .send({ wholeDay: true })
        .expect(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies);
      const getBody = getResponse.body as DataResponse<CalendarEntry>;
      expect(getBody.data.wholeDay).toBe(true);
    });

    it('should strip HTML tags from title and content on update', async () => {
      await request(app.getHttpServer())
        .patch(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies)
        .send({
          title: '<em>Updated</em> Title',
          content: '<div>Updated</div> content',
        })
        .expect(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies);
      const getBody = getResponse.body as DataResponse<CalendarEntry>;
      expect(getBody.data.title).toBe('Updated Title');
      expect(getBody.data.content).toBe('Updated content');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/calendar/${updateEntryId}`)
        .send({ title: 'New Title' })
        .expect(401);
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .patch(`/calendar/${fakeId}`)
        .set('Cookie', userCookies)
        .send({ title: 'New Title' })
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Calendar entry not found');
    });

    it('should return 400 when updated startDate is after existing endDate', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies)
        .send({ startDate: '2025-04-10T15:00:00.000Z' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('startDate must be before or equal to endDate');
    });

    it('should return 400 when updated endDate is before existing startDate', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies)
        .send({ endDate: '2025-04-10T08:00:00.000Z' })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('startDate must be before or equal to endDate');
    });

    it("should return 404 when updating another user's entry", async () => {
      // Create entry as other user
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', otherUserCookies)
        .send({
          title: 'Other User Entry',
          startDate: '2025-04-20T09:00:00.000Z',
          endDate: '2025-04-20T10:00:00.000Z',
        });
      const otherEntryId = await findEntryByTitle(
        prisma,
        'Other User Entry',
        otherUser.email,
      );

      // Try to update as main user
      const response = await request(app.getHttpServer())
        .patch(`/calendar/${otherEntryId}`)
        .set('Cookie', userCookies)
        .send({ title: 'Hacked Title' })
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Calendar entry not found');
    });
  });

  describe('DELETE /calendar/:id', () => {
    let deleteEntryId: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Entry to Delete',
          startDate: '2025-05-10T10:00:00.000Z',
          endDate: '2025-05-10T11:00:00.000Z',
        });
      deleteEntryId = await findEntryByTitle(
        prisma,
        'Entry to Delete',
        testUser.email,
      );
    });

    it('should delete a calendar entry', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/calendar/${deleteEntryId}`)
        .set('Cookie', userCookies)
        .expect(200);

      const body = response.body as MessageResponse;
      expect(body.message).toBe('Deleted calendar entry');

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/calendar/${deleteEntryId}`)
        .set('Cookie', userCookies)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/calendar/${deleteEntryId}`)
        .expect(401);
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .delete(`/calendar/${fakeId}`)
        .set('Cookie', userCookies)
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Calendar entry not found');
    });

    it("should return 404 when deleting another user's entry", async () => {
      // Create entry as other user
      await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', otherUserCookies)
        .send({
          title: 'Other User Entry to Delete',
          startDate: '2025-05-20T09:00:00.000Z',
          endDate: '2025-05-20T10:00:00.000Z',
        });
      const otherEntryId = await findEntryByTitle(
        prisma,
        'Other User Entry to Delete',
        otherUser.email,
      );

      // Try to delete as main user
      const response = await request(app.getHttpServer())
        .delete(`/calendar/${otherEntryId}`)
        .set('Cookie', userCookies)
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Calendar entry not found');

      // Verify it still exists for the other user
      const getResponse = await request(app.getHttpServer())
        .get(`/calendar/${otherEntryId}`)
        .set('Cookie', otherUserCookies);
      expect(getResponse.status).toBe(200);
    });
  });

  describe('Recurring entries', () => {
    describe('POST /calendar (recurring)', () => {
      it('should create a daily recurring entry', async () => {
        const response = await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'Daily Standup',
            startDate: '2026-06-01T09:00:00.000Z',
            endDate: '2026-06-01T09:30:00.000Z',
            recurrenceFrequency: 'DAILY',
            recurrenceUntil: '2026-06-05T09:00:00.000Z',
          })
          .expect(201);

        const body = response.body as MessageResponse;
        expect(body.message).toBe('Calendar entry created');
      });

      it('should create a weekly recurring entry with byDay', async () => {
        await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'Weekly MWF Meeting',
            startDate: '2026-06-01T10:00:00.000Z',
            endDate: '2026-06-01T11:00:00.000Z',
            recurrenceFrequency: 'WEEKLY',
            recurrenceByDay: 'MO,WE,FR',
            recurrenceUntil: '2026-06-30T10:00:00.000Z',
          })
          .expect(201);
      });

      it('should create a monthly recurring entry', async () => {
        await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'Monthly Review',
            startDate: '2026-06-01T14:00:00.000Z',
            endDate: '2026-06-01T15:00:00.000Z',
            recurrenceFrequency: 'MONTHLY',
            recurrenceUntil: '2026-09-01T14:00:00.000Z',
          })
          .expect(201);
      });

      it('should return 400 when recurrenceByDay is used with DAILY', async () => {
        const response = await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'Invalid',
            startDate: '2026-06-01T09:00:00.000Z',
            endDate: '2026-06-01T09:30:00.000Z',
            recurrenceFrequency: 'DAILY',
            recurrenceByDay: 'MO,WE',
          })
          .expect(400);

        const body = response.body as ErrorResponse;
        expect(body.message).toContain('error.recurrenceByDayRequiresWeekly');
      });

      it('should return 400 for invalid recurrenceFrequency', async () => {
        await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'Invalid',
            startDate: '2026-06-01T09:00:00.000Z',
            endDate: '2026-06-01T09:30:00.000Z',
            recurrenceFrequency: 'YEARLY',
          })
          .expect(400);
      });

      it('should return 400 for invalid recurrenceByDay format', async () => {
        await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'Invalid',
            startDate: '2026-06-01T09:00:00.000Z',
            endDate: '2026-06-01T09:30:00.000Z',
            recurrenceFrequency: 'WEEKLY',
            recurrenceByDay: 'MONDAY',
          })
          .expect(400);
      });
    });

    describe('GET /calendar (recurring expansion)', () => {
      let dailyEntryId: string;

      beforeAll(async () => {
        // Clean up and create a fresh daily recurring entry
        await prisma.recurrenceException.deleteMany({
          where: {
            calendarEntry: {
              user: { email: testUser.email },
              title: 'Expand Test Daily',
            },
          },
        });
        await prisma.calendarEntry.deleteMany({
          where: {
            title: 'Expand Test Daily',
            user: { email: testUser.email },
          },
        });

        await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'Expand Test Daily',
            startDate: '2026-07-01T09:00:00.000Z',
            endDate: '2026-07-01T09:30:00.000Z',
            recurrenceFrequency: 'DAILY',
            recurrenceUntil: '2026-07-05T09:00:00.000Z',
          });
        dailyEntryId = await findEntryByTitle(
          prisma,
          'Expand Test Daily',
          testUser.email,
        );
      });

      it('should expand recurring entries into virtual occurrences', async () => {
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-07-01T00:00:00.000Z',
            endDate: '2026-07-05T23:59:59.000Z',
          })
          .set('Cookie', userCookies)
          .expect(200);

        const body = response.body as DataResponse<CalendarEntry[]>;
        const dailyOccurrences = body.data.filter(
          (e) => e.title === 'Expand Test Daily',
        );
        expect(dailyOccurrences).toHaveLength(5);
        expect(dailyOccurrences[0].isRecurring).toBe(true);
        expect(dailyOccurrences[0].recurrenceFrequency).toBe('DAILY');
      });

      it('should return synthetic IDs for expanded occurrences', async () => {
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-07-01T00:00:00.000Z',
            endDate: '2026-07-05T23:59:59.000Z',
          })
          .set('Cookie', userCookies)
          .expect(200);

        const body = response.body as DataResponse<CalendarEntry[]>;
        const dailyOccurrences = body.data.filter(
          (e) => e.title === 'Expand Test Daily',
        );

        // Synthetic IDs contain a colon after the UUID
        for (const occ of dailyOccurrences) {
          expect(occ.id).toContain(':');
          expect(occ.id.startsWith(dailyEntryId)).toBe(true);
        }
      });

      it('should not return occurrences outside the query window', async () => {
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-07-03T00:00:00.000Z',
            endDate: '2026-07-04T23:59:59.000Z',
          })
          .set('Cookie', userCookies)
          .expect(200);

        const body = response.body as DataResponse<CalendarEntry[]>;
        const dailyOccurrences = body.data.filter(
          (e) => e.title === 'Expand Test Daily',
        );
        expect(dailyOccurrences).toHaveLength(2); // Jul 3 and Jul 4
      });

      it('should set isRecurring=false for non-recurring entries', async () => {
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2025-01-15T00:00:00.000Z',
            endDate: '2025-01-15T23:59:59.000Z',
          })
          .set('Cookie', userCookies)
          .expect(200);

        const body = response.body as DataResponse<CalendarEntry[]>;
        const nonRecurring = body.data.filter((e) => !e.isRecurring);
        for (const entry of nonRecurring) {
          expect(entry.isRecurring).toBe(false);
        }
      });
    });

    describe('GET /calendar/:id (synthetic ID)', () => {
      let parentId: string;

      beforeAll(async () => {
        await prisma.recurrenceException.deleteMany({
          where: {
            calendarEntry: {
              user: { email: testUser.email },
              title: 'FindOne Recurring',
            },
          },
        });
        await prisma.calendarEntry.deleteMany({
          where: {
            title: 'FindOne Recurring',
            user: { email: testUser.email },
          },
        });

        await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'FindOne Recurring',
            startDate: '2026-08-01T09:00:00.000Z',
            endDate: '2026-08-01T09:30:00.000Z',
            recurrenceFrequency: 'DAILY',
            recurrenceUntil: '2026-08-03T09:00:00.000Z',
          });
        parentId = await findEntryByTitle(
          prisma,
          'FindOne Recurring',
          testUser.email,
        );
      });

      it('should return a specific occurrence by synthetic ID', async () => {
        const syntheticId = `${parentId}:2026-08-02T09:00:00.000Z`;
        const response = await request(app.getHttpServer())
          .get(`/calendar/${encodeURIComponent(syntheticId)}`)
          .set('Cookie', userCookies)
          .expect(200);

        const body = response.body as DataResponse<CalendarEntry>;
        expect(body.data.title).toBe('FindOne Recurring');
        expect(body.data.isRecurring).toBe(true);
        expect(body.data.startDate).toBe('2026-08-02T09:00:00.000Z');
      });

      it('should return 404 for occurrence outside recurrence range', async () => {
        const syntheticId = `${parentId}:2026-08-10T09:00:00.000Z`;
        await request(app.getHttpServer())
          .get(`/calendar/${encodeURIComponent(syntheticId)}`)
          .set('Cookie', userCookies)
          .expect(404);
      });
    });

    describe('PATCH /calendar/:id (recurring update)', () => {
      let parentId: string;

      beforeEach(async () => {
        await prisma.recurrenceException.deleteMany({
          where: {
            calendarEntry: {
              user: { email: testUser.email },
              title: 'Update Recurring',
            },
          },
        });
        await prisma.calendarEntry.deleteMany({
          where: { title: 'Update Recurring', user: { email: testUser.email } },
        });
        // Also clean up split entries
        await prisma.calendarEntry.deleteMany({
          where: {
            title: 'Updated Recurring',
            user: { email: testUser.email },
          },
        });

        await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'Update Recurring',
            startDate: '2026-09-01T09:00:00.000Z',
            endDate: '2026-09-01T09:30:00.000Z',
            recurrenceFrequency: 'DAILY',
            recurrenceUntil: '2026-09-05T09:00:00.000Z',
          });
        parentId = await findEntryByTitle(
          prisma,
          'Update Recurring',
          testUser.email,
        );
      });

      it('should update all occurrences with scope ALL', async () => {
        await request(app.getHttpServer())
          .patch(`/calendar/${parentId}`)
          .set('Cookie', userCookies)
          .send({ title: 'Updated Recurring', scope: 'ALL' })
          .expect(200);

        // Verify all occurrences have the new title
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-09-01T00:00:00.000Z',
            endDate: '2026-09-05T23:59:59.000Z',
          })
          .set('Cookie', userCookies);
        const body = response.body as DataResponse<CalendarEntry[]>;
        const occurrences = body.data.filter((e) => e.id.startsWith(parentId));
        expect(occurrences.length).toBe(5);
        occurrences.forEach((o) => expect(o.title).toBe('Updated Recurring'));
      });

      it('should update a single occurrence with scope SINGLE', async () => {
        const syntheticId = `${parentId}:2026-09-03T09:00:00.000Z`;
        await request(app.getHttpServer())
          .patch(`/calendar/${encodeURIComponent(syntheticId)}`)
          .set('Cookie', userCookies)
          .send({ title: 'Special Meeting', scope: 'SINGLE' })
          .expect(200);

        // Verify only that occurrence changed
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-09-01T00:00:00.000Z',
            endDate: '2026-09-05T23:59:59.000Z',
          })
          .set('Cookie', userCookies);
        const body = response.body as DataResponse<CalendarEntry[]>;
        const occurrences = body.data.filter((e) => e.id.startsWith(parentId));
        const modifiedOcc = occurrences.find(
          (o) => o.originalDate === '2026-09-03T09:00:00.000Z',
        );
        expect(modifiedOcc?.title).toBe('Special Meeting');

        // Other occurrences unchanged
        const otherOccs = occurrences.filter(
          (o) => o.originalDate !== '2026-09-03T09:00:00.000Z',
        );
        otherOccs.forEach((o) => expect(o.title).toBe('Update Recurring'));
      });

      it('should split series with scope THIS_AND_FUTURE', async () => {
        const syntheticId = `${parentId}:2026-09-03T09:00:00.000Z`;
        await request(app.getHttpServer())
          .patch(`/calendar/${encodeURIComponent(syntheticId)}`)
          .set('Cookie', userCookies)
          .send({ title: 'New Series', scope: 'THIS_AND_FUTURE' })
          .expect(200);

        // Verify: original series now ends before Sep 3
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-09-01T00:00:00.000Z',
            endDate: '2026-09-05T23:59:59.000Z',
          })
          .set('Cookie', userCookies);
        const body = response.body as DataResponse<CalendarEntry[]>;

        const oldSeries = body.data.filter(
          (e) => e.title === 'Update Recurring',
        );
        const newSeries = body.data.filter((e) => e.title === 'New Series');

        expect(oldSeries).toHaveLength(2); // Sep 1, Sep 2
        expect(newSeries).toHaveLength(3); // Sep 3, Sep 4, Sep 5
      });
    });

    describe('DELETE /calendar/:id (recurring delete)', () => {
      let parentId: string;

      beforeEach(async () => {
        await prisma.recurrenceException.deleteMany({
          where: {
            calendarEntry: {
              user: { email: testUser.email },
              title: 'Delete Recurring',
            },
          },
        });
        await prisma.calendarEntry.deleteMany({
          where: { title: 'Delete Recurring', user: { email: testUser.email } },
        });

        await request(app.getHttpServer())
          .post('/calendar')
          .set('Cookie', userCookies)
          .send({
            title: 'Delete Recurring',
            startDate: '2026-10-01T09:00:00.000Z',
            endDate: '2026-10-01T09:30:00.000Z',
            recurrenceFrequency: 'DAILY',
            recurrenceUntil: '2026-10-05T09:00:00.000Z',
          });
        parentId = await findEntryByTitle(
          prisma,
          'Delete Recurring',
          testUser.email,
        );
      });

      it('should delete all occurrences with scope ALL', async () => {
        await request(app.getHttpServer())
          .delete(`/calendar/${parentId}`)
          .query({ scope: 'ALL' })
          .set('Cookie', userCookies)
          .expect(200);

        // Verify no occurrences remain
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-10-01T00:00:00.000Z',
            endDate: '2026-10-05T23:59:59.000Z',
          })
          .set('Cookie', userCookies);
        const body = response.body as DataResponse<CalendarEntry[]>;
        const occurrences = body.data.filter(
          (e) => e.title === 'Delete Recurring',
        );
        expect(occurrences).toHaveLength(0);
      });

      it('should cancel a single occurrence with scope SINGLE', async () => {
        const syntheticId = `${parentId}:2026-10-03T09:00:00.000Z`;
        await request(app.getHttpServer())
          .delete(`/calendar/${encodeURIComponent(syntheticId)}`)
          .query({ scope: 'SINGLE' })
          .set('Cookie', userCookies)
          .expect(200);

        // Verify: 4 occurrences remain (Oct 1, 2, 4, 5)
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-10-01T00:00:00.000Z',
            endDate: '2026-10-05T23:59:59.000Z',
          })
          .set('Cookie', userCookies);
        const body = response.body as DataResponse<CalendarEntry[]>;
        const occurrences = body.data.filter(
          (e) => e.title === 'Delete Recurring',
        );
        expect(occurrences).toHaveLength(4);
      });

      it('should truncate series with scope THIS_AND_FUTURE', async () => {
        const syntheticId = `${parentId}:2026-10-03T09:00:00.000Z`;
        await request(app.getHttpServer())
          .delete(`/calendar/${encodeURIComponent(syntheticId)}`)
          .query({ scope: 'THIS_AND_FUTURE' })
          .set('Cookie', userCookies)
          .expect(200);

        // Verify: only 2 occurrences remain (Oct 1, 2)
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-10-01T00:00:00.000Z',
            endDate: '2026-10-05T23:59:59.000Z',
          })
          .set('Cookie', userCookies);
        const body = response.body as DataResponse<CalendarEntry[]>;
        const occurrences = body.data.filter(
          (e) => e.title === 'Delete Recurring',
        );
        expect(occurrences).toHaveLength(2);
      });

      it('should delete entire series when THIS_AND_FUTURE on first occurrence', async () => {
        const syntheticId = `${parentId}:2026-10-01T09:00:00.000Z`;
        await request(app.getHttpServer())
          .delete(`/calendar/${encodeURIComponent(syntheticId)}`)
          .query({ scope: 'THIS_AND_FUTURE' })
          .set('Cookie', userCookies)
          .expect(200);

        // Verify: no occurrences remain
        const response = await request(app.getHttpServer())
          .get('/calendar')
          .query({
            startDate: '2026-10-01T00:00:00.000Z',
            endDate: '2026-10-05T23:59:59.000Z',
          })
          .set('Cookie', userCookies);
        const body = response.body as DataResponse<CalendarEntry[]>;
        const occurrences = body.data.filter(
          (e) => e.title === 'Delete Recurring',
        );
        expect(occurrences).toHaveLength(0);
      });
    });
  });
});
