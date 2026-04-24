import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import nodemailer from 'nodemailer';

import { env } from '@/shared/config/env';
import { siteConfig } from '@/shared/config/site';
import { signInTemplate } from '@/shared/lib/templates/sign-in-template';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/auth/login',
  },

  providers: [
    EmailProvider({
      maxAge: 30 * 60, // 30 minutes
      server: {
        host: env.EMAIL_SERVER_HOST,
        port: env.EMAIL_SERVER_PORT,
        auth: {
          user: env.EMAIL_SERVER_USER,
          pass: env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: env.EMAIL_FROM,

      sendVerificationRequest,
    }),

    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),

    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name ?? token.name;

        const dbUser = await prisma.user.findUnique({
          where: { email: user.email as string },
        });

        token.role =
          dbUser?.role && ['USER', 'ADMIN'].includes(dbUser.role)
            ? dbUser.role
            : 'USER';
        if (account) {
          token.provider = account.provider;
        }

        return token;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.provider = token.provider as string;
      }

      return session;
    },
  },
});

async function sendVerificationRequest({ identifier, url, provider }: Any) {
  const transporter = nodemailer.createTransport(provider.server);
  const fromName = siteConfig.name;

  try {
    await transporter.sendMail({
      to: identifier,
      from: provider.from,
      subject: `Sign in to ${fromName}`,
      text: `Sign in to ${fromName}\n${url}\n\n`,
      html: await signInTemplate({ url, host: fromName }),
    });
  } catch (error: Any) {
    logger.error(
      `[Nodemailer] Send verification email got error: ${error.message}`
    );
    throw new Error('Could not send verification email.');
  }
}
