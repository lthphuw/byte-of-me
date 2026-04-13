import nodemailer from 'nodemailer';

import { env } from '@/shared/config/env';

export const mailer = nodemailer.createTransport({
  host: env.EMAIL_SERVER_HOST,
  port: Number(env.EMAIL_SERVER_PORT),
  secure: env.EMAIL_SERVER_PORT === 465,
  auth: {
    user: env.EMAIL_SERVER_USER,
    pass: env.EMAIL_SERVER_PASSWORD,
  },
});
