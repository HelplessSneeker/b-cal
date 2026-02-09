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
const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
const mockGetRequest = jest.fn().mockReturnValue({ url: '/test' });
const mockSwitchToHttp = jest.fn().mockReturnValue({
  getResponse: mockGetResponse,
  getRequest: mockGetRequest,
});
const mockHost = { switchToHttp: mockSwitchToHttp } as Partial<ArgumentsHost>;

const mockSuperCatch = jest.fn();

jest.mock('@sentry/nestjs/setup', () => {
  class MockSentryGlobalFilter {
    catch(...args: any[]) {
      mockSuperCatch(...args);
    }
  }
  return { SentryGlobalFilter: MockSentryGlobalFilter };
});

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
    });
  });

  it('should delegate non-HTTP exceptions to SentryGlobalFilter', () => {
    const exception = new Error('Something broke');
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockSuperCatch).toHaveBeenCalledWith(exception, mockHost);
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('should delegate non-Error exceptions to SentryGlobalFilter', () => {
    const exception = 'string error';
    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockSuperCatch).toHaveBeenCalledWith(exception, mockHost);
    expect(mockStatus).not.toHaveBeenCalled();
  });
});
