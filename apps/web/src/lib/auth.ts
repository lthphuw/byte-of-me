import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@db/client';
import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';

import { env } from '@/env.mjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/auth/login',
  },

  providers: [
    EmailProvider({
      server: {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT),
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      },
      from: env.SMTP_FROM,
      //   async sendVerificationRequest({ identifier, url, provider }) {
      //     const { host } = new URL(url);
      //
      //     const transporter = nodemailer.createTransport(provider.server);
      //
      //     const result = await transporter.sendMail({
      //       to: identifier,
      //       from: provider.from,
      //       subject: `Sign in to ${host}`,
      //       text: `Sign in to ${host}\n${url}`,
      //       html: `
      //         <p>Sign in to <strong>${host}</strong></p>
      //         <p><a href="${url}">Click here to sign in</a></p>
      //         <p>If you did not request this email, you can ignore it.</p>
      //       `.trim(),
      //     });
      //
      //     console.log("Magic Link:", url);
      //
      //     const failed = [...result.rejected, ...result.pending].filter(Boolean);
      //     if (failed.length > 0)
      //       throw new Error(`Email (${failed.join(", ")}) could not be sent`);
      //   },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // New user logging in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        return token;
      }

      // Existing user
      if (!token.email) return token;

      const dbUser = await prisma.user.findUnique({
        where: { email: token.email },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      if (!dbUser) return token;

      token.id = dbUser.id;
      token.name = dbUser.name;
      token.email = dbUser.email;
      token.picture = dbUser.image;

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
});
