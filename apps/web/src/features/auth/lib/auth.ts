import { getUserProfile } from '@/entities/user-profile/api/get-user-profile';
import { sendVerificationRequest } from '@/features/auth/lib/send-verification-request';
import { env } from '@/shared/config/env';

import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';

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
  ],

  callbacks: {
    async jwt({ token, user }) {
      logger.debug('[JWT Callback] Token before processing:', token);
      logger.debug('[JWT Callback] User object:', user);

      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;

        const dbUser = await getUserProfile();
        if (dbUser.success) {
          token.role = dbUser.data.role;
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
      }
      return session;
    },
  },
});
