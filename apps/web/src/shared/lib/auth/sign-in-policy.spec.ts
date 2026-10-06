/**
 * Pins who the `signIn` callback lets through, against the real
 * `isSiteOwnerEmail`. `env.OWNER_EMAIL` is pinned per test and restored, as
 * `session.spec.ts` explains.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { evaluateSignIn } from './sign-in-policy';

import { env } from '@/shared/config/env';

let bootOwnerEmail: string | undefined;

beforeAll(() => {
  bootOwnerEmail = env.OWNER_EMAIL;
});

beforeEach(() => {
  env.OWNER_EMAIL = undefined;
});

afterEach(() => {
  env.OWNER_EMAIL = bootOwnerEmail;
});

const STRANGER = 'stranger@example.com';
const emailAccount = { provider: 'email', type: 'email' };
const oauth = (provider: string, type = 'oauth') => ({ provider, type });

describe('evaluateSignIn — magic link', () => {
  it('refuses to mail or redeem a link for anyone but the owner', () => {
    expect(
      evaluateSignIn({ user: { email: STRANGER }, account: emailAccount })
    ).toMatchObject({ allowed: false });
  });

  it('allows the owner, whatever the case or padding', () => {
    expect(
      evaluateSignIn({
        user: { email: `  ${env.EMAIL.toUpperCase()} ` },
        account: emailAccount,
      })
    ).toEqual({ allowed: true });
  });

  it('refuses a request that carries no address', () => {
    expect(
      evaluateSignIn({ user: { email: null }, account: emailAccount })
    ).toMatchObject({ allowed: false });
  });
});

describe('evaluateSignIn — OAuth email verification', () => {
  it.each([
    ['google', 'oidc'],
    ['google-admin', 'oidc'],
    ['github', 'oauth'],
    ['github-admin', 'oauth'],
  ])(
    'refuses %s when the provider does not vouch for the address',
    (provider, type) => {
      const user = { email: env.EMAIL };

      for (const profile of [
        { email_verified: false },
        { email_verified: 'true' },
        {},
        null,
        undefined,
      ]) {
        expect(
          evaluateSignIn({ user, account: oauth(provider, type), profile })
        ).toMatchObject({ allowed: false });
      }
    }
  );

  it('lets a verified public identity in, owner or not', () => {
    for (const provider of ['google', 'github']) {
      expect(
        evaluateSignIn({
          user: { email: STRANGER },
          account: oauth(provider),
          profile: { email_verified: true },
        })
      ).toEqual({ allowed: true });
    }
  });
});

describe('evaluateSignIn — admin buttons', () => {
  it('refuses a verified non-owner on the -admin ids', () => {
    for (const provider of ['github-admin', 'google-admin']) {
      expect(
        evaluateSignIn({
          user: { email: STRANGER },
          account: oauth(provider),
          profile: { email_verified: true },
        })
      ).toMatchObject({ allowed: false });
    }
  });

  it('admits the verified owner on the -admin ids', () => {
    for (const provider of ['github-admin', 'google-admin']) {
      expect(
        evaluateSignIn({
          user: { email: env.EMAIL },
          account: oauth(provider),
          profile: { email_verified: true },
        })
      ).toEqual({ allowed: true });
    }
  });
});
