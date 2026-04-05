import { logger } from '@byte-of-me/logger';
import nodemailer from 'nodemailer';

import { siteConfig } from '@/config/site';
import { signInTemplate } from '@/lib/mail/sign-in-template';

export async function sendVerificationRequest({
  identifier,
  url,
  provider,
}: any) {
  const transporter = nodemailer.createTransport(provider.server);
  const fromName = siteConfig.name;

  try {
    await transporter.sendMail({
      to: identifier,
      from: provider.from,
      subject: `Sign in to ${fromName}`,
      text: `Sign in to ${fromName}\n${url}\n\n`,
      html: signInTemplate({ url, host: fromName }),
    });
  } catch (error: any) {
    logger.error(
      `[Nodemailer] Send verification email got error: ${error.message}`
    );
    throw new Error('Could not send verification email.');
  }
}
