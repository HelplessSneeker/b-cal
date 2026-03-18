import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private transporterPromise: Promise<Transporter> | null = null;

  constructor(private config: ConfigService) {}

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (this.transporterPromise) {
      return this.transporterPromise;
    }

    this.transporterPromise = this.initTransporter();
    this.transporter = await this.transporterPromise;
    return this.transporter;
  }

  private async initTransporter(): Promise<Transporter> {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      const host = this.config.get<string>('MAIL_HOST');
      const port = this.config.get<string>('MAIL_PORT');
      const user = this.config.get<string>('MAIL_USER');
      const pass = this.config.get<string>('MAIL_PASS');

      if (!host || !user || !pass) {
        throw new Error(
          'Mail configuration missing. Set MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS environment variables.',
        );
      }

      return nodemailer.createTransport({
        host,
        port: port ? parseInt(port, 10) : 587,
        secure: port === '465',
        auth: { user, pass },
      });
    }

    // Development: use Ethereal test account
    const testAccount = await nodemailer.createTestAccount();

    this.logger.debug(`Ethereal User: ${testAccount.user}`);
    this.logger.debug(`Ethereal Pass: ${testAccount.pass}`);
    this.logger.debug(`Preview URL: https://ethereal.email`);

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  private getFromAddress(): string {
    return (
      this.config.get<string>('MAIL_FROM') ?? '"b-cal" <noreply@b-cal.dev>'
    );
  }

  async sendMail(
    options: nodemailer.SendMailOptions,
  ): Promise<nodemailer.SentMessageInfo> {
    const transporter = await this.getTransporter();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const info: nodemailer.SentMessageInfo =
      await transporter.sendMail(options);

    if (this.config.get<string>('NODE_ENV') !== 'production') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.logger.debug(`Preview: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
  }

  async sendVerificationEmail(
    email: string,
    token: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const verifyUrl = `${this.config.get<string>('FRONTEND_URL')}/verify-email?token=${token}`;

    return this.sendMail({
      from: this.getFromAddress(),
      to: email,
      subject: 'Verify your email',
      html: this.buildEmailHtml({
        heading: 'Verify your email',
        description:
          'Thanks for signing up for b-cal! Click the button below to verify your email address.',
        buttonText: 'Verify Email',
        buttonUrl: verifyUrl,
        footerText:
          "If you didn't create an account, you can safely ignore this email.",
      }),
    });
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const resetUrl = `${this.config.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    return this.sendMail({
      from: this.getFromAddress(),
      to: email,
      subject: 'Reset your password',
      html: this.buildEmailHtml({
        heading: 'Reset your password',
        description:
          'We received a request to reset your password. Click the button below to choose a new one.',
        buttonText: 'Reset Password',
        buttonUrl: resetUrl,
        footerText:
          "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.",
      }),
    });
  }

  async sendReminderEmail(
    email: string,
    title: string,
    startDate: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const formattedDate = new Date(startDate).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const calendarUrl = `${this.config.get<string>('FRONTEND_URL')}/`;

    return this.sendMail({
      from: this.getFromAddress(),
      to: email,
      subject: `Reminder: ${title}`,
      html: this.buildEmailHtml({
        heading: 'Upcoming Event',
        description: `Your event <strong>${title}</strong> is starting at ${formattedDate}.`,
        buttonText: 'Open Calendar',
        buttonUrl: calendarUrl,
        footerText:
          'You are receiving this because you set a reminder for this event.',
      }),
    });
  }

  private buildEmailHtml(options: {
    heading: string;
    description: string;
    buttonText: string;
    buttonUrl: string;
    footerText?: string;
  }): string {
    const { heading, description, buttonText, buttonUrl, footerText } = options;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <span style="font-size:20px;font-weight:700;color:#1a1f2e;letter-spacing:-0.5px;">b-cal</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1a1f2e;text-align:center;">${heading}</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#1a1f2e;text-align:center;">${description}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${buttonUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:#1a1f2e;color:#fafafa;font-size:15px;font-weight:500;text-decoration:none;border-radius:8px;">${buttonText}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#6b7280;text-align:center;word-break:break-all;">Or copy this link: ${buttonUrl}</p>
            </td>
          </tr>${
            footerText
              ? `
          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding-top:20px;">
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;text-align:center;">${footerText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ''
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
