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

interface CalendarEntry {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  content: string | null;
  userId: string;
}

interface DataResponse<T> {
  data: T;
}

interface UserResponse {
  data: {
    id: string;
    email: string;
  };
}

function extractCookies(response: request.Response): string[] {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return [];
  return Array.isArray(cookies) ? cookies : [cookies];
}

function extractIdFromMessage(body: MessageResponse): string {
  const match = body.message.match(/id (\S+)/);
  return match ? match[1] : '';
}

describe('CalendarController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create test user and get cookies
    await request(app.getHttpServer()).post('/auth/signup').send(testUser);
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
    const otherLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(otherUser);
    otherUserCookies = extractCookies(otherLoginResponse);
  });

  afterAll(async () => {
    // Clean up calendar entries first (foreign key constraint)
    await prisma.calenderEntry.deleteMany({
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
      expect(body.message).toMatch(/Calendar entry with id .+ created/);
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
      expect(body.message).toMatch(/Calendar entry with id .+ created/);
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
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Specific Entry',
          startDate: '2025-03-10T14:00:00.000Z',
          endDate: '2025-03-10T15:00:00.000Z',
          content: 'Entry for testing findOne',
        });
      testEntryId = extractIdFromMessage(response.body as MessageResponse);
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
      expect(body.message).toBe(`Calendar entry with id ${fakeId} not found`);
    });

    it("should return 404 when accessing another user's entry", async () => {
      // Create entry as other user
      const createResponse = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', otherUserCookies)
        .send({
          title: 'Private Entry',
          startDate: '2025-03-15T09:00:00.000Z',
          endDate: '2025-03-15T10:00:00.000Z',
        });
      const otherEntryId = extractIdFromMessage(
        createResponse.body as MessageResponse,
      );

      // Try to access as main user
      const response = await request(app.getHttpServer())
        .get(`/calendar/${otherEntryId}`)
        .set('Cookie', userCookies)
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe(
        `Calendar entry with id ${otherEntryId} not found`,
      );
    });
  });

  describe('PATCH /calendar/:id', () => {
    let updateEntryId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Entry to Update',
          startDate: '2025-04-10T10:00:00.000Z',
          endDate: '2025-04-10T11:00:00.000Z',
          content: 'Original content',
        });
      updateEntryId = extractIdFromMessage(response.body as MessageResponse);
    });

    it('should update a calendar entry title', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/calendar/${updateEntryId}`)
        .set('Cookie', userCookies)
        .send({ title: 'Updated Title' })
        .expect(200);

      const body = response.body as MessageResponse;
      expect(body.message).toMatch(
        /Calander entry with id .+ has been updated/,
      );

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
      expect(body.message).toBe(`Calendar entry with id ${fakeId} not found`);
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
      const createResponse = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', otherUserCookies)
        .send({
          title: 'Other User Entry',
          startDate: '2025-04-20T09:00:00.000Z',
          endDate: '2025-04-20T10:00:00.000Z',
        });
      const otherEntryId = extractIdFromMessage(
        createResponse.body as MessageResponse,
      );

      // Try to update as main user
      const response = await request(app.getHttpServer())
        .patch(`/calendar/${otherEntryId}`)
        .set('Cookie', userCookies)
        .send({ title: 'Hacked Title' })
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe(
        `Calendar entry with id ${otherEntryId} not found`,
      );
    });
  });

  describe('DELETE /calendar/:id', () => {
    let deleteEntryId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', userCookies)
        .send({
          title: 'Entry to Delete',
          startDate: '2025-05-10T10:00:00.000Z',
          endDate: '2025-05-10T11:00:00.000Z',
        });
      deleteEntryId = extractIdFromMessage(response.body as MessageResponse);
    });

    it('should delete a calendar entry', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/calendar/${deleteEntryId}`)
        .set('Cookie', userCookies)
        .expect(200);

      const body = response.body as MessageResponse;
      expect(body.message).toMatch(/Deletd Calendar entry with id/);

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
      expect(body.message).toBe(`Calendar entry with id ${fakeId} not found`);
    });

    it("should return 404 when deleting another user's entry", async () => {
      // Create entry as other user
      const createResponse = await request(app.getHttpServer())
        .post('/calendar')
        .set('Cookie', otherUserCookies)
        .send({
          title: 'Other User Entry to Delete',
          startDate: '2025-05-20T09:00:00.000Z',
          endDate: '2025-05-20T10:00:00.000Z',
        });
      const otherEntryId = extractIdFromMessage(
        createResponse.body as MessageResponse,
      );

      // Try to delete as main user
      const response = await request(app.getHttpServer())
        .delete(`/calendar/${otherEntryId}`)
        .set('Cookie', userCookies)
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe(
        `Calendar entry with id ${otherEntryId} not found`,
      );

      // Verify it still exists for the other user
      const getResponse = await request(app.getHttpServer())
        .get(`/calendar/${otherEntryId}`)
        .set('Cookie', otherUserCookies);
      expect(getResponse.status).toBe(200);
    });
  });
});
