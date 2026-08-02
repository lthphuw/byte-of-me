import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import NextAuth from 'next-auth';
import EmailProvider, {
  type EmailProviderSendVerificationRequestParams,
} from 'next-auth/providers/email';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import nodemailer from 'nodemailer';

import 'server-only';

import { env } from '@/shared/config/env';
import { siteConfig } from '@/shared/config/site';
import {
  ADMIN_OAUTH_PROVIDER_IDS,
  isAdminOAuthProviderId,
} from '@/shared/lib/auth/admin-oauth-providers';
import { isSiteOwnerEmail } from '@/shared/lib/auth/site-owner';
import { signInTemplate } from '@/shared/lib/templates/sign-in-template';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * Linking by verified email is what makes the admin OAuth buttons usable at
 * all. The owner's `User` row is created by the email magic link, so without
 * this an OAuth sign-in for the same address fails with
 * `OAuthAccountNotLinked` rather than signing them in.
 *
 * "Dangerous" is Auth.js warning that it trusts the provider's word on the
 * address. Both GitHub and Google only release verified addresses, and the
 * account this can link into is gated a second time by `isSiteOwnerEmail()`
 * in the `signIn` callback, so the linking decision is not the only thing
 * standing between a stranger and the dashboard.
 */
const allowDangerousEmailAccountLinking = true;

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
      allowDangerousEmailAccountLinking,
    }),

    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking,
    }),

    // The admin-surface twins. Same OAuth applications, different ids — see
    // `ADMIN_OAUTH_PROVIDER_IDS` for why the duplication is load-bearing.
    GitHub({
      id: ADMIN_OAUTH_PROVIDER_IDS.GITHUB,
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking,
    }),

    Google({
      id: ADMIN_OAUTH_PROVIDER_IDS.GOOGLE,
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking,
    }),
  ],

  callbacks: {
    /**
     * Rejects anyone but the site owner from the admin OAuth buttons.
     *
     * This is a UX gate, not the trust boundary — `getAuthenticatedAdmin()`
     * and `requireAdmin()` remain the boundary (AGENTS §5), and a stranger
     * who signs in here would only ever receive a `USER` session anyway. What
     * it buys is a clear refusal instead of a silent sign-in that then bounces
     * off every protected route with no explanation.
     *
     * Only the `-admin` ids are gated. The bare `github` / `google` providers
     * are what the public comment modal uses and must keep admitting everyone.
     */
    async signIn({ user, account }) {
      if (!account || !isAdminOAuthProviderId(account.provider)) {
        return true;
      }

      if (isSiteOwnerEmail(user.email)) {
        return true;
      }

      logger.warn(
        `Admin OAuth sign-in refused: ${account.provider} identity is not the site owner`
      );

      return false;
    },

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

async function sendVerificationRequest({
  identifier,
  url,
  provider,
}: EmailProviderSendVerificationRequestParams) {
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
  } catch (error) {
    logger.error(
      `[Nodemailer] Send verification email got error: ${getErrorMessage(error)}`
    );
    throw new Error('Could not send verification email.');
  }
}
