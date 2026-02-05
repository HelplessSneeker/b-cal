import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
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

    console.log(`Ethereal User: ${testAccount.user}`);
    console.log(`Ethereal Pass: ${testAccount.pass}`);
    console.log(`Preview URL: https://ethereal.email`);

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
      console.log(`Preview: ${nodemailer.getTestMessageUrl(info)}`);
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
      html: `
        <h1>Email Verification</h1>
        <p>Click below to verify:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
      `,
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
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `,
    });
  }
}
