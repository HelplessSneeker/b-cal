export const MAIL_JOB_SEND = 'send-mail';

export type MailJobData =
  | { type: 'verification'; email: string; token: string }
  | { type: 'password-reset'; email: string; token: string }
  | { type: 'reminder'; email: string; title: string; startDate: string };
