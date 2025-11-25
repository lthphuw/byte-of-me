import { prisma as db } from '@db/client';
import { logger } from '@logger/logger';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import mail from '@sendgrid/mail';
import { NextAuthOptions } from "next-auth"
import EmailProvider from 'next-auth/providers/email';

import { env } from '@/env.mjs';


mail.setApiKey(env.SENDGRID_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
  },

  providers: [
    EmailProvider({
      from: env.SMTP_FROM,

      async sendVerificationRequest({ identifier, url, provider }) {
        // fetch user exactly once, minimal fields
        const user = await db.user.findUnique({
          where: { email: identifier },
          select: { email: true },
        });

        const templateId = user
          ? env.SENDGRID_SIGN_IN_TEMPLATE
          : env.SENDGRID_ACTIVATION_TEMPLATE;

        if (!templateId) {
          throw new Error('Missing SendGrid template id');
        }

        try {
          await mail.send({
            to: identifier,
            from: provider.from as string,
            templateId,
            dynamicTemplateData: {
              url,
            },
          });
        } catch (err: any) {
          // SendGrid error formatting is different
          logger('next-auth').error('sendgrid_error', err?.response?.body || err);
          throw new Error('Unable to send verification email');
        }
      },
    }),
  ],

  callbacks: {
    async session({ session, token  }) {
      console.log(`Session callback called: ${JSON.stringify(session)} ${JSON.stringify(token)} `);
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
      }
      return session;
    },

    async jwt({ token, user }) {
      console.log(`JWT callback called: ${token} ${user}`);
      // If just signed in (first time), user object exists
      if (user) {
        token.id = user.id;
        return token;
      }

      // Find user in DB once per JWT load
      const dbUser = await db.user.findUnique({
        where: { email: token.email! },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      if (!dbUser) return token;

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      };
    },
  },

  logger: {
    error(code, ...message) {
      logger('next-auth').error(code, message);
    },
    warn(code, ...message) {
      logger('next-auth').warn(code, message);
    },
    debug(code, ...message) {
      logger('next-auth').debug(code, message);
    },
  },
};
