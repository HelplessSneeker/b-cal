import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockClearCookie = jest.fn();
const mockGetResponse = jest
  .fn()
  .mockReturnValue({ status: mockStatus, clearCookie: mockClearCookie });
const mockGetRequest = jest.fn().mockReturnValue({
  url: '/test',
  path: '/test',
  id: 'test-request-id',
  headers: {},
});
const mockSwitchToHttp = jest.fn().mockReturnValue({
  getResponse: mockGetResponse,
  getRequest: mockGetRequest,
});
const mockHost = { switchToHttp: mockSwitchToHttp } as Partial<ArgumentsHost>;

const mockSuperCatch = jest.fn();
const mockSetTag = jest.fn();

jest.mock('@sentry/nestjs/setup', () => {
  class MockSentryGlobalFilter {
    catch(...args: unknown[]) {
      mockSuperCatch(...args);
    }
  }
  return { SentryGlobalFilter: MockSentryGlobalFilter };
});

jest.mock('@sentry/nestjs', () => ({
  setTag: (key: string, value: string) => {
    mockSetTag(key, value);
  },
}));

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.clearAllMocks();
    mockStatus.mockReturnValue({ json: mockJson });
  });

  it('should handle BadRequestException (400)', () => {
    const exception = new BadRequestException('Invalid input');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid input',
        requestId: 'test-request-id',
      }),
    );
  });

  it('should handle UnauthorizedException (401)', () => {
    const exception = new UnauthorizedException('Login failed');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Login failed',
        requestId: 'test-request-id',
      }),
    );
  });

  it('should handle ForbiddenException (403)', () => {
    const exception = new ForbiddenException('Access denied');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        requestId: 'test-request-id',
      }),
    );
  });

  it('should handle NotFoundException (404)', () => {
    const exception = new NotFoundException('Not found');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not found',
        requestId: 'test-request-id',
      }),
    );
  });

  it('should handle ConflictException (409)', () => {
    const exception = new ConflictException('Email already registered');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: 'Email already registered',
        requestId: 'test-request-id',
      }),
    );
  });

  it('should handle validation errors (array of messages)', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['email must be an email', 'password is too short'],
      error: 'Bad Request',
    });
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['email must be an email', 'password is too short'],
      error: 'Bad Request',
      requestId: 'test-request-id',
    });
  });

  it('should delegate non-HTTP exceptions to SentryGlobalFilter', () => {
    const exception = new Error('Something broke');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockSuperCatch).toHaveBeenCalledWith(exception, mockHost);
    expect(mockSetTag).toHaveBeenCalledWith('requestId', 'test-request-id');
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('should delegate non-Error exceptions to SentryGlobalFilter', () => {
    const exception = 'string error';
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockSuperCatch).toHaveBeenCalledWith(exception, mockHost);
    expect(mockSetTag).toHaveBeenCalledWith('requestId', 'test-request-id');
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('should fall back to x-request-id header when request.id is missing', () => {
    mockGetRequest.mockReturnValueOnce({
      url: '/test',
      path: '/test',
      id: undefined,
      headers: { 'x-request-id': 'header-request-id' },
    });
    const exception = new BadRequestException('Bad');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'header-request-id' }),
    );
  });

  it('should clear auth cookies when /auth/refresh fails with HttpException', () => {
    mockGetRequest.mockReturnValueOnce({
      url: '/auth/refresh',
      path: '/auth/refresh',
      id: 'test-request-id',
      headers: {},
    });
    const exception = new UnauthorizedException('Unauthorized');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockClearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.any(Object),
    );
    expect(mockClearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.any(Object),
    );
  });

  it('should clear auth cookies when /auth/refresh fails with non-HTTP exception', () => {
    mockGetRequest.mockReturnValueOnce({
      url: '/auth/refresh',
      path: '/auth/refresh',
      id: 'test-request-id',
      headers: {},
    });
    const exception = new Error('ECONNREFUSED');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockClearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.any(Object),
    );
    expect(mockClearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.any(Object),
    );
  });

  it('should not clear auth cookies for non-refresh endpoints', () => {
    const exception = new UnauthorizedException('Unauthorized');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockClearCookie).not.toHaveBeenCalled();
  });
});
