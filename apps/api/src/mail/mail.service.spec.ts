import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

const mockSendMail = jest.fn();
const mockTransporter = {
  sendMail: mockSendMail,
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:8080',
      MAIL_FROM: 'test@b-cal.dev',
    };
    return config[key];
  }),
};

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    jest.clearAllMocks();

    (nodemailer.createTestAccount as jest.Mock).mockResolvedValue({
      user: 'ethereal-user',
      pass: 'ethereal-pass',
    });
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    (nodemailer.getTestMessageUrl as jest.Mock).mockReturnValue(
      'https://ethereal.email/message/123',
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMail', () => {
    it('should send email using transporter', async () => {
      const mailOptions = {
        from: 'test@b-cal.dev',
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };
      const mockInfo = { messageId: '123' };
      mockSendMail.mockResolvedValue(mockInfo);

      const result = (await service.sendMail(mailOptions)) as {
        messageId: string;
      };

      expect(result).toEqual(mockInfo);
      expect(mockSendMail).toHaveBeenCalledWith(mailOptions);
    });

    it('should create Ethereal transporter in non-production environment', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(nodemailer.createTestAccount).toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal-user',
          pass: 'ethereal-pass',
        },
      });
    });

    it('should log preview URL in non-production environment', async () => {
      const loggerSpy = jest
        .spyOn(service['logger'], 'debug')
        .mockImplementation();
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        'Preview: https://ethereal.email/message/123',
      );
      loggerSpy.mockRestore();
    });

    it('should reuse existing transporter on subsequent calls', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendMail({ to: 'a@b.com', subject: 'Test', html: '' });
      await service.sendMail({ to: 'c@d.com', subject: 'Test 2', html: '' });

      expect(nodemailer.createTestAccount).toHaveBeenCalledTimes(1);
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct content', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendVerificationEmail('user@example.com', 'verify-token');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@b-cal.dev',
          to: 'user@example.com',
          subject: 'Verify your email',
        }),
      );
      const sentHtml = String(
        (mockSendMail.mock.calls[0] as [{ html: string }])[0].html,
      );
      expect(sentHtml).toContain(
        'http://localhost:8080/verify-email?token=verify-token',
      );
    });

    it('should include verification link in email HTML', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendVerificationEmail('user@example.com', 'my-token');

      const callArgs = (mockSendMail.mock.calls[0] as [{ html: string }])[0];
      expect(callArgs.html).toContain('Verify your email');
      expect(callArgs.html).toContain(
        'href="http://localhost:8080/verify-email?token=my-token"',
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct content', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendPasswordResetEmail('user@example.com', 'reset-token');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@b-cal.dev',
          to: 'user@example.com',
          subject: 'Reset your password',
        }),
      );
      const sentHtml = String(
        (mockSendMail.mock.calls[0] as [{ html: string }])[0].html,
      );
      expect(sentHtml).toContain(
        'http://localhost:8080/reset-password?token=reset-token',
      );
    });

    it('should include reset link and expiry notice in email HTML', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendPasswordResetEmail(
        'user@example.com',
        'my-reset-token',
      );

      const callArgs = (mockSendMail.mock.calls[0] as [{ html: string }])[0];
      expect(callArgs.html).toContain('Reset your password');
      expect(callArgs.html).toContain(
        'href="http://localhost:8080/reset-password?token=my-reset-token"',
      );
      expect(callArgs.html).toContain('expires in 1 hour');
    });
  });

  describe('production environment', () => {
    let productionService: MailService;
    let productionConfigService: { get: jest.Mock };

    beforeEach(async () => {
      productionConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            NODE_ENV: 'production',
            FRONTEND_URL: 'https://b-cal.dev',
            MAIL_FROM: 'noreply@b-cal.dev',
            MAIL_HOST: 'smtp.example.com',
            MAIL_PORT: '587',
            MAIL_USER: 'mail-user',
            MAIL_PASS: 'mail-pass',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: productionConfigService },
        ],
      }).compile();

      productionService = module.get<MailService>(MailService);
    });

    it('should create production SMTP transporter', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await productionService.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(nodemailer.createTestAccount).not.toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'mail-user',
          pass: 'mail-pass',
        },
      });
    });

    it('should use secure connection on port 465', async () => {
      productionConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'production',
          MAIL_HOST: 'smtp.example.com',
          MAIL_PORT: '465',
          MAIL_USER: 'mail-user',
          MAIL_PASS: 'mail-pass',
        };
        return config[key];
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: productionConfigService },
        ],
      }).compile();

      const secureService = module.get<MailService>(MailService);
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await secureService.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        }),
      );
    });

    it('should throw error if mail config is missing in production', async () => {
      productionConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string | undefined> = {
          NODE_ENV: 'production',
          MAIL_HOST: undefined,
        };
        return config[key];
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: productionConfigService },
        ],
      }).compile();

      const incompleteService = module.get<MailService>(MailService);

      await expect(
        incompleteService.sendMail({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        }),
      ).rejects.toThrow('Mail configuration missing');
    });

    it('should not log preview URL in production', async () => {
      const loggerSpy = jest
        .spyOn(productionService['logger'], 'debug')
        .mockImplementation();
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await productionService.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Preview:'),
      );
      loggerSpy.mockRestore();
    });
  });

  describe('getFromAddress', () => {
    it('should use MAIL_FROM config when available', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendVerificationEmail('user@example.com', 'token');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@b-cal.dev',
        }),
      );
    });

    it('should use default from address when MAIL_FROM is not set', async () => {
      const noMailFromConfig = {
        get: jest.fn((key: string) => {
          const config: Record<string, string | undefined> = {
            NODE_ENV: 'test',
            FRONTEND_URL: 'http://localhost:8080',
            MAIL_FROM: undefined,
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: noMailFromConfig },
        ],
      }).compile();

      const serviceWithoutMailFrom = module.get<MailService>(MailService);
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await serviceWithoutMailFrom.sendVerificationEmail(
        'user@example.com',
        'token',
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"b-cal" <noreply@b-cal.dev>',
        }),
      );
    });
  });
});
