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
import { ADMIN_OAUTH_PROVIDER_IDS } from '@/shared/lib/auth/admin-oauth-providers';
import { fetchGitHubProfile } from '@/shared/lib/auth/github-userinfo';
import { isMagicLinkRequestAllowed } from '@/shared/lib/auth/magic-link-rate-limit';
import { evaluateSignIn } from '@/shared/lib/auth/sign-in-policy';
import { isSiteOwnerEmail } from '@/shared/lib/auth/site-owner';
import { signInTemplate } from '@/shared/lib/templates/sign-in-template';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * On so an OAuth sign-in reaches the owner row the magic link created (else
 * `OAuthAccountNotLinked`). It trusts the provider's address, hence the
 * verified-email rule in `evaluateSignIn`.
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
      userinfo: { request: fetchGitHubProfile },
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
      userinfo: { request: fetchGitHubProfile },
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
     * The rules are in `evaluateSignIn`. Only the `-admin` ids are owner-gated:
     * the bare `github` / `google` ids serve the public comment modal.
     */
    async signIn({ user, account, profile, email }) {
      const decision = evaluateSignIn({ user, account, profile });

      if (!decision.allowed) {
        logger.warn(`Sign-in refused: ${decision.reason}`);
        return false;
      }

      // Auth.js calls this just before mailing a magic link.
      if (email?.verificationRequest && !(await isMagicLinkRequestAllowed())) {
        logger.warn('Sign-in refused: too many magic-link requests');
        return false;
      }

      return true;
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
  // Backstop behind `evaluateSignIn`: the one place mail is sent.
  if (!isSiteOwnerEmail(identifier)) {
    throw new Error('Could not send verification email.');
  }

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
      `[Nodemailer] Send verification email got error: ${getErrorMessage(
        error
      )}`
    );
    throw new Error('Could not send verification email.');
  }
}
